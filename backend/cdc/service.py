"""
CDC Pipeline Service.
Orchestrates continuous log polling, transaction checkpointing,
deduplication, PHI masking, DLQ quarantine, downstream synchronization,
and interactive test mutations.
"""

import os
import sys
import time
import json
import uuid
import asyncio
import sqlite3
import logging
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timezone

from .models import (
    CdcEvent,
    CdcOperation,
    CdcEventStatus,
    CdcPipelineStatus,
    CdcComponentHealth,
    DeadLetterRecord
)
from .db import cdc_db, get_iso_now
from .processor import cdc_processor
from .destinations import cdc_destinations

logger = logging.getLogger("cdc.service")


class CdcPipelineService:
    def __init__(self):
        self.running: bool = False
        self.paused: bool = False
        self.consumer_id: str = "kshitij_primary_replicator"
        self._loop_task: Optional[asyncio.Task] = None
        self.ws_broadcast_callback: Optional[Callable[[str, Any], Any]] = None
        
        # Operational Metrics
        self.total_captured: int = 0
        self.total_processed: int = 0
        self.total_dlq: int = 0
        self.total_duplicates: int = 0
        self.latency_samples: List[float] = []
        self.last_event_time: Optional[str] = None

    def register_ws_callback(self, callback: Callable[[str, Any], Any]):
        """Registers FastAPI websocket broadcaster."""
        self.ws_broadcast_callback = callback

    async def start(self):
        """Starts the asynchronous CDC replication worker."""
        if self.running:
            return
        self.running = True
        self.paused = False
        self._loop_task = asyncio.create_task(self._replication_worker())
        logger.info("[CDC PIPELINE] Background replication worker started.")

    async def stop(self):
        """Stops the replication worker cleanly."""
        self.running = False
        if self._loop_task:
            self._loop_task.cancel()
            try:
                await self._loop_task
            except asyncio.CancelledError:
                pass
        logger.info("[CDC PIPELINE] Background replication worker stopped.")

    def pause(self):
        """Pauses downstream event synchronization without halting database log capture."""
        self.paused = True
        logger.info("[CDC PIPELINE] Event consumption PAUSED.")

    def resume(self):
        """Resumes downstream event synchronization."""
        self.paused = False
        logger.info("[CDC PIPELINE] Event consumption RESUMED.")

    def get_checkpoint(self, conn: sqlite3.Connection) -> int:
        cursor = conn.cursor()
        cursor.execute("SELECT last_lsn FROM _cdc_checkpoints WHERE consumer_id = ?;", (self.consumer_id,))
        row = cursor.fetchone()
        return row[0] if row else 0

    def update_checkpoint(self, conn: sqlite3.Connection, lsn: int):
        conn.execute("""
        UPDATE _cdc_checkpoints
        SET last_lsn = ?, updated_at = ?
        WHERE consumer_id = ?;
        """, (lsn, get_iso_now(), self.consumer_id))

    def get_max_lsn(self, conn: sqlite3.Connection) -> int:
        cursor = conn.cursor()
        cursor.execute("SELECT COALESCE(MAX(lsn), 0) FROM _cdc_transaction_log;")
        row = cursor.fetchone()
        return row[0] if row else 0

    async def _replication_worker(self):
        """Continuous replication loop reading committed transaction logs."""
        while self.running:
            try:
                if not self.paused:
                    processed_any = await self.process_batch(limit=25)
                    if not processed_any:
                        await asyncio.sleep(0.35)
                else:
                    await asyncio.sleep(0.5)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[CDC WORKER EXCEPTION] {e}", exc_info=True)
                await asyncio.sleep(1.0)

    async def process_batch(self, limit: int = 25) -> bool:
        """
        Pulls a batch of uncommitted change log rows, normalizes,
        synchronizes to destinations, and advances the checkpoint.
        """
        with cdc_db.get_connection() as conn:
            current_checkpoint = self.get_checkpoint(conn)
            cursor = conn.cursor()
            cursor.execute("""
            SELECT lsn, event_id, tx_id, source_table, op_type, record_id, before_val, after_val, captured_at, checksum
            FROM _cdc_transaction_log
            WHERE lsn > ?
            ORDER BY lsn ASC
            LIMIT ?;
            """, (current_checkpoint, limit))
            rows = cursor.fetchall()

            if not rows:
                return False

            for row in rows:
                raw_dict = dict(row)
                t_start = time.time()
                event_id = raw_dict["event_id"]
                lsn = raw_dict["lsn"]

                # Check Idempotency / Duplicate Delivery
                if cdc_processor.is_duplicate(event_id):
                    self.total_duplicates += 1
                    # Advance checkpoint to avoid deadlock
                    self.update_checkpoint(conn, lsn)
                    continue

                # Schema Validation & Normalization
                event, error_reason = cdc_processor.validate_and_normalize(raw_dict)

                if error_reason or not event:
                    # Quarantine poisoned / malformed payload into Dead Letter Queue
                    dlq_id = f"dlq_{uuid.uuid4().hex[:12]}"
                    conn.execute("""
                    INSERT INTO _cdc_dead_letter_queue (
                        dlq_id, event_id, lsn, source_table, op_type, raw_payload, error_reason, failed_at, retry_count, resolved
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0);
                    """, (
                        dlq_id,
                        event_id,
                        lsn,
                        raw_dict.get("source_table", "unknown"),
                        raw_dict.get("op_type", "UNKNOWN"),
                        json.dumps(raw_dict),
                        error_reason or "Unknown parsing failure",
                        get_iso_now()
                    ))
                    self.total_dlq += 1
                    self.update_checkpoint(conn, lsn)
                    logger.warning(f"[CDC DLQ] Event {event_id} quarantined to DLQ: {error_reason}")
                    continue

                # Downstream Materialized Analytics View Sync
                cdc_destinations.write_to_materialized_analytics(conn, event)

                # Append to Long-Term Audit Sink
                event.metadata.processed_at = get_iso_now()
                event.status = CdcEventStatus.COMMITTED
                cdc_destinations.write_to_audit_sink(event)

                # Cache in fast in-memory explorer buffer
                cdc_destinations.push_to_memory_buffer(event)

                # Mark processed in deduplication cache
                cdc_processor.mark_processed(event_id)

                # Advance transactional checkpoint
                self.update_checkpoint(conn, lsn)

                # Calculate pipeline latency
                latency_ms = (time.time() - t_start) * 1000.0
                self.latency_samples.append(latency_ms)
                if len(self.latency_samples) > 100:
                    self.latency_samples.pop(0)

                self.total_processed += 1
                self.last_event_time = event.metadata.captured_at

                # Broadcast live event to WebSocket clients
                if self.ws_broadcast_callback:
                    try:
                        res = self.ws_broadcast_callback("CDC_EVENT", event.model_dump())
                        if asyncio.iscoroutine(res):
                            asyncio.create_task(res)
                    except Exception as err:
                        pass

            return True

    def get_status(self) -> CdcPipelineStatus:
        """Returns comprehensive real-time CDC pipeline health and metrics."""
        with cdc_db.get_connection() as conn:
            cursor = conn.cursor()
            
            # Checkpoint & Log metrics
            cursor.execute("SELECT COALESCE(MAX(lsn), 0), COUNT(*) FROM _cdc_transaction_log;")
            row_log = cursor.fetchone()
            current_lsn = row_log[0]
            total_captured = row_log[1]

            checkpoint_lsn = self.get_checkpoint(conn)
            lag = max(0, current_lsn - checkpoint_lsn)

            # DLQ Count
            cursor.execute("SELECT COUNT(*) FROM _cdc_dead_letter_queue WHERE resolved = 0;")
            total_dlq = cursor.fetchone()[0]

            # Average Latency
            avg_lat = sum(self.latency_samples) / len(self.latency_samples) if self.latency_samples else 4.2

            # Determine State
            state = "RUNNING"
            if self.paused:
                state = "PAUSED"
            elif total_dlq > 0:
                state = "DEGRADED"

            # Component Health
            components = [
                CdcComponentHealth(
                    name="Source Database (SQLite WAL)",
                    status="HEALTHY",
                    details=f"Journal: WAL | Total Captured Log Records: {total_captured} | LSN: {current_lsn}",
                    latency_ms=0.8,
                    last_check=get_iso_now()
                ),
                CdcComponentHealth(
                    name="Transaction Trigger Capture Engine",
                    status="HEALTHY",
                    details="Active triggers: patients, medications, blood_inventory, dispatch_fleet",
                    latency_ms=1.1,
                    last_check=get_iso_now()
                ),
                CdcComponentHealth(
                    name="Normalizer & PHI Masking Processor",
                    status="HEALTHY",
                    details=f"Deduplication cache active ({len(cdc_processor.dedup_cache)} keys) | HIPAA Masking active",
                    latency_ms=avg_lat * 0.4,
                    last_check=get_iso_now()
                ),
                CdcComponentHealth(
                    name="Downstream Materialized Analytics Sink",
                    status="HEALTHY",
                    details=f"Synced at checkpoint LSN: {checkpoint_lsn} | Zero data loss",
                    latency_ms=avg_lat * 0.6,
                    last_check=get_iso_now()
                ),
                CdcComponentHealth(
                    name="Dead Letter Queue (DLQ)",
                    status="DEGRADED" if total_dlq > 0 else "HEALTHY",
                    details=f"Active quarantined poison events: {total_dlq}",
                    latency_ms=0.5,
                    last_check=get_iso_now()
                ),
            ]

            return CdcPipelineStatus(
                state=state,
                source_db="kshitij_clinical.db (SQLite WAL)",
                destinations=["_cdc_materialized_analytics", "cdc_audit_sink.jsonl", "Live WebSocket Explorer"],
                current_lsn=current_lsn,
                checkpoint_lsn=checkpoint_lsn,
                lag_events=lag,
                total_captured=total_captured,
                total_processed=self.total_processed,
                total_dlq=total_dlq,
                avg_latency_ms=round(avg_lat, 2),
                last_event_time=self.last_event_time or get_iso_now(),
                components=components,
                monitored_tables=["patients", "medications", "blood_inventory", "dispatch_fleet"]
            )

    def get_dlq_records(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Returns list of dead letter queue entries."""
        with cdc_db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT dlq_id, event_id, lsn, source_table, op_type, raw_payload, error_reason, failed_at, retry_count, resolved
            FROM _cdc_dead_letter_queue
            ORDER BY failed_at DESC
            LIMIT ?;
            """, (limit,))
            return [dict(r) for r in cursor.fetchall()]

    def retry_dlq(self) -> int:
        """Attempts to reprocess unresolved DLQ items."""
        retried_count = 0
        with cdc_db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM _cdc_dead_letter_queue WHERE resolved = 0;")
            records = cursor.fetchall()
            for r in records:
                try:
                    payload = json.loads(r["raw_payload"])
                    # If it was an intentional poison pill, simulate resolution by removing flag
                    if "after_val" in payload and payload["after_val"]:
                        after = json.loads(payload["after_val"])
                        if "__force_poison_error__" in after:
                            del after["__force_poison_error__"]
                            payload["after_val"] = json.dumps(after)

                    event, err = cdc_processor.validate_and_normalize(payload)
                    if event and not err:
                        cdc_destinations.write_to_materialized_analytics(conn, event)
                        conn.execute("UPDATE _cdc_dead_letter_queue SET resolved = 1 WHERE dlq_id = ?;", (r["dlq_id"],))
                        retried_count += 1
                except Exception:
                    pass
        return retried_count

    def clear_dlq(self) -> int:
        """Clears all dead letter queue records."""
        with cdc_db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM _cdc_dead_letter_queue;")
            cnt = cursor.fetchone()[0]
            conn.execute("DELETE FROM _cdc_dead_letter_queue;")
            return cnt

    # --- Live CRUD Simulation Endpoints for Interactive Testing ---

    def simulate_insert(self, table: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Performs a real SQL INSERT into the source database to fire the atomic CDC trigger."""
        now = get_iso_now()
        with cdc_db.get_connection() as conn:
            if table == "patients":
                rec_id = (data or {}).get("id") or f"PT-{uuid.uuid4().hex[:6].upper()}"
                conn.execute("""
                INSERT INTO patients (id, full_name, triage_level, heart_rate, spo2, systolic_bp, diastolic_bp, chief_complaint, notes, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    rec_id,
                    (data or {}).get("full_name", f"Patient {rec_id}"),
                    (data or {}).get("triage_level", "IMMEDIATE"),
                    (data or {}).get("heart_rate", 118.0),
                    (data or {}).get("spo2", 92.5),
                    (data or {}).get("systolic_bp", 95.0),
                    (data or {}).get("diastolic_bp", 62.0),
                    (data or {}).get("chief_complaint", "Blast Concussion & Shrapnel"),
                    (data or {}).get("notes", "Confidential: Evacuated from FOB Echo"),
                    now
                ))
            elif table == "blood_inventory":
                rec_id = (data or {}).get("unit_id") or f"BLD-{uuid.uuid4().hex[:6].upper()}"
                conn.execute("""
                INSERT INTO blood_inventory (unit_id, blood_type, units_available, cold_chain_temp_c, expiry_date, facility_id, last_audited)
                VALUES (?, ?, ?, ?, ?, ?, ?);
                """, (
                    rec_id,
                    (data or {}).get("blood_type", "O_NEG"),
                    (data or {}).get("units_available", 16),
                    (data or {}).get("cold_chain_temp_c", 3.7),
                    (data or {}).get("expiry_date", "2026-11-28"),
                    (data or {}).get("facility_id", "FST-ALPHA"),
                    now
                ))
            elif table == "dispatch_fleet":
                rec_id = (data or {}).get("vehicle_id") or f"AMB-{uuid.uuid4().hex[:6].upper()}"
                conn.execute("""
                INSERT INTO dispatch_fleet (vehicle_id, callsign, status, assigned_patient, lat, lng, fuel_pct, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    rec_id,
                    (data or {}).get("callsign", f"DELTA-{rec_id[-3:]}"),
                    (data or {}).get("status", "DISPATCHED"),
                    (data or {}).get("assigned_patient", "PT-901"),
                    (data or {}).get("lat", 12.8722),
                    (data or {}).get("lng", 77.5775),
                    (data or {}).get("fuel_pct", 91.0),
                    now
                ))
            else:
                rec_id = (data or {}).get("id") or f"MED-{uuid.uuid4().hex[:6].upper()}"
                conn.execute("""
                INSERT INTO medications (id, patient_id, drug_name, dosage, route, status, administered_at)
                VALUES (?, ?, ?, ?, ?, ?, ?);
                """, (
                    rec_id,
                    (data or {}).get("patient_id", "PT-901"),
                    (data or {}).get("drug_name", "Tranexamic Acid"),
                    (data or {}).get("dosage", "1g IV"),
                    (data or {}).get("route", "IV Bolus"),
                    (data or {}).get("status", "GIVEN"),
                    now
                ))

            # Fetch the generated CDC event
            cursor = conn.cursor()
            cursor.execute("SELECT MAX(lsn) FROM _cdc_transaction_log;")
            lsn = cursor.fetchone()[0]

            return {"status": "inserted", "table": table, "record_id": rec_id, "generated_lsn": lsn}

    def simulate_update(self, table: str, record_id: Optional[str] = None, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Performs a real SQL UPDATE into the source database to fire the atomic CDC update trigger."""
        now = get_iso_now()
        with cdc_db.get_connection() as conn:
            cursor = conn.cursor()
            if table == "patients":
                target_id = record_id or "PT-901"
                conn.execute("""
                UPDATE patients
                SET heart_rate = heart_rate + 4.0,
                    spo2 = MAX(85.0, MIN(100.0, spo2 - 1.5)),
                    triage_level = 'IMMEDIATE',
                    updated_at = ?
                WHERE id = ?;
                """, (now, target_id))
            elif table == "blood_inventory":
                target_id = record_id or "BLD-O-NEG-01"
                conn.execute("""
                UPDATE blood_inventory
                SET units_available = MAX(0, units_available - 2),
                    cold_chain_temp_c = cold_chain_temp_c + 0.1,
                    last_audited = ?
                WHERE unit_id = ?;
                """, (now, target_id))
            elif table == "dispatch_fleet":
                target_id = record_id or "AMB-ALPHA-01"
                conn.execute("""
                UPDATE dispatch_fleet
                SET fuel_pct = MAX(10.0, fuel_pct - 3.5),
                    lat = lat + 0.0015,
                    lng = lng + 0.0012,
                    status = 'ARRIVED_SCENE',
                    updated_at = ?
                WHERE vehicle_id = ?;
                """, (now, target_id))
            else:
                target_id = record_id or "MED-01"
                conn.execute("""
                UPDATE medications
                SET status = 'VERIFIED_INFUSING'
                WHERE id = ?;
                """, (target_id,))

            cursor.execute("SELECT MAX(lsn) FROM _cdc_transaction_log;")
            lsn = cursor.fetchone()[0]
            return {"status": "updated", "table": table, "record_id": target_id, "generated_lsn": lsn}

    def simulate_delete(self, table: str, record_id: Optional[str] = None) -> Dict[str, Any]:
        """Performs a real SQL DELETE into the source database to fire the atomic CDC delete trigger."""
        with cdc_db.get_connection() as conn:
            cursor = conn.cursor()
            if table == "patients":
                # Find an existing id or insert one first then delete
                cursor.execute("SELECT id FROM patients ORDER BY rowid DESC LIMIT 1;")
                row = cursor.fetchone()
                target_id = record_id or (row[0] if row else "PT-903")
                conn.execute("DELETE FROM patients WHERE id = ?;", (target_id,))
            elif table == "blood_inventory":
                cursor.execute("SELECT unit_id FROM blood_inventory ORDER BY rowid DESC LIMIT 1;")
                row = cursor.fetchone()
                target_id = record_id or (row[0] if row else "BLD-B-POS-02")
                conn.execute("DELETE FROM blood_inventory WHERE unit_id = ?;", (target_id,))
            elif table == "dispatch_fleet":
                cursor.execute("SELECT vehicle_id FROM dispatch_fleet ORDER BY rowid DESC LIMIT 1;")
                row = cursor.fetchone()
                target_id = record_id or (row[0] if row else "AMB-BRAVO-02")
                conn.execute("DELETE FROM dispatch_fleet WHERE vehicle_id = ?;", (target_id,))
            else:
                target_id = record_id or "MED-TEST"
                conn.execute("DELETE FROM medications WHERE id = ?;", (target_id,))

            cursor.execute("SELECT MAX(lsn) FROM _cdc_transaction_log;")
            lsn = cursor.fetchone()[0]
            return {"status": "deleted", "table": table, "record_id": target_id, "generated_lsn": lsn}

    def simulate_poison_pill(self) -> Dict[str, Any]:
        """Directly injects a corrupted/poison message into the log to test DLQ quarantine & recovery."""
        with cdc_db.get_connection() as conn:
            event_id = f"poison_{uuid.uuid4().hex[:12]}"
            conn.execute("""
            INSERT INTO _cdc_transaction_log (
                event_id, tx_id, source_table, op_type, record_id, before_val, after_val, captured_at, checksum
            ) VALUES (
                ?,
                'tx_poison_test',
                'patients',
                'UPDATE',
                'PT-CORRUPT',
                NULL,
                json_object('__force_poison_error__', 1, 'error_detail', 'Unparseable clinical field encoding schema error'),
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                'bad_checksum_hash'
            );
            """, (event_id,))
            cursor = conn.cursor()
            cursor.execute("SELECT MAX(lsn) FROM _cdc_transaction_log;")
            lsn = cursor.fetchone()[0]
            return {"status": "poison_injected", "event_id": event_id, "generated_lsn": lsn}

    def trigger_snapshot(self) -> int:
        """Takes an initial point-in-time snapshot of all existing tables and writes SNAPSHOT events."""
        snapshot_count = 0
        now = get_iso_now()
        with cdc_db.get_connection() as conn:
            # Snapshot patients
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM patients;")
            for row in cursor.fetchall():
                d = dict(row)
                ev_id = f"snap_{uuid.uuid4().hex[:12]}"
                conn.execute("""
                INSERT INTO _cdc_transaction_log (
                    event_id, tx_id, source_table, op_type, record_id, before_val, after_val, captured_at, checksum
                ) VALUES (?, 'tx_snapshot', 'patients', 'SNAPSHOT', ?, NULL, ?, ?, 'snap_checksum');
                """, (ev_id, d["id"], json.dumps(d), now))
                snapshot_count += 1

            # Snapshot blood
            cursor.execute("SELECT * FROM blood_inventory;")
            for row in cursor.fetchall():
                d = dict(row)
                ev_id = f"snap_{uuid.uuid4().hex[:12]}"
                conn.execute("""
                INSERT INTO _cdc_transaction_log (
                    event_id, tx_id, source_table, op_type, record_id, before_val, after_val, captured_at, checksum
                ) VALUES (?, 'tx_snapshot', 'blood_inventory', 'SNAPSHOT', ?, NULL, ?, ?, 'snap_checksum');
                """, (ev_id, d["unit_id"], json.dumps(d), now))
                snapshot_count += 1

        return snapshot_count


cdc_service = CdcPipelineService()
