"""
CDC Downstream Destinations:
1. Transactional Materialized Analytics View in SQLite (_cdc_materialized_analytics)
2. Append-Only Long-Term Audit Sink (JSON-Lines / Parquet archive)
3. In-Memory Real-Time Buffer for Website Live Explorer
"""

import os
import json
import sqlite3
from typing import Dict, Any, List, Optional
from collections import deque
from datetime import datetime, timezone

from .models import CdcEvent, CdcOperation, CdcEventStatus
from .db import cdc_db, get_iso_now

AUDIT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
AUDIT_LOG_FILE = os.path.join(AUDIT_DIR, "cdc_audit_sink.jsonl")


class CdcDestinationManager:
    def __init__(self, buffer_size: int = 200):
        self.buffer_size = buffer_size
        self.recent_events: deque = deque(maxlen=buffer_size)
        os.makedirs(AUDIT_DIR, exist_ok=True)

    def write_to_materialized_analytics(self, conn: sqlite3.Connection, event: CdcEvent):
        """
        Synchronizes changes to downstream materialized analytics view.
        Supports INSERT, UPDATE, and DELETE (tombstoning/removal).
        """
        table = event.metadata.source_table
        rec_id = event.metadata.record_id
        lsn = event.metadata.lsn
        now = get_iso_now()

        if event.metadata.op_type == CdcOperation.DELETE:
            # Propagate deletion / tombstone to downstream view
            conn.execute("""
            DELETE FROM _cdc_materialized_analytics
            WHERE entity_type = ? AND entity_id = ?;
            """, (table, rec_id))
        else:
            # Upsert active state to downstream materialized analytics
            summary = event.after or {}
            conn.execute("""
            INSERT INTO _cdc_materialized_analytics (entity_type, entity_id, summary_json, last_lsn, synced_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(entity_type, entity_id) DO UPDATE SET
                summary_json = excluded.summary_json,
                last_lsn = excluded.last_lsn,
                synced_at = excluded.synced_at;
            """, (table, rec_id, json.dumps(summary), lsn, now))

    def write_to_audit_sink(self, event: CdcEvent):
        """Appends CDC record to persistent audit file for compliance, replay, and search."""
        try:
            record_dict = event.model_dump()
            with open(AUDIT_LOG_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(record_dict) + "\n")
        except Exception as e:
            # Fallback logging if disk append fails
            print(f"[CDC SINK ERROR] Could not append to audit file: {e}")

    def push_to_memory_buffer(self, event: CdcEvent):
        """Stores event in circular buffer for instant frontend explorer queries."""
        self.recent_events.appendleft(event)

    def get_recent_events(
        self,
        limit: int = 50,
        table: Optional[str] = None,
        op: Optional[str] = None
    ) -> List[CdcEvent]:
        """Filters and retrieves recent events from the in-memory circular buffer."""
        results = []
        for ev in self.recent_events:
            if table and ev.metadata.source_table.lower() != table.lower():
                continue
            if op and ev.metadata.op_type.value.lower() != op.lower():
                continue
            results.append(ev)
            if len(results) >= limit:
                break
        return results

    def get_materialized_view_summary(self) -> Dict[str, Any]:
        """Reads downstream materialized analytics metrics."""
        with cdc_db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT entity_type, COUNT(*) as cnt, MAX(last_lsn) as max_lsn, MAX(synced_at) as last_sync
            FROM _cdc_materialized_analytics
            GROUP BY entity_type;
            """)
            rows = cursor.fetchall()
            stats = {}
            for row in rows:
                stats[row["entity_type"]] = {
                    "count": row["cnt"],
                    "max_lsn": row["max_lsn"],
                    "last_sync": row["last_sync"]
                }
            return stats


cdc_destinations = CdcDestinationManager()
