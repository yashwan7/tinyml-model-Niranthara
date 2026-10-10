"""
CDC Database Manager and SQLite Transaction Log Engine.
Provides transactional write-ahead log (WAL) capture via atomic triggers,
checkpoint management, dead letter storage, and business entity schema definitions.
"""

import os
import sqlite3
import json
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
DB_PATH = os.path.join(DB_DIR, "kshitij_clinical.db")


def get_iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def compute_sha256(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()[:16]


class CdcDatabaseManager:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_database()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0, isolation_level=None)
        conn.row_factory = sqlite3.Row
        # Enable WAL mode for high concurrency non-blocking reads/writes
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def init_database(self):
        with self.get_connection() as conn:
            # 1. Business Entities (Sources for CDC)
            conn.executescript("""
            CREATE TABLE IF NOT EXISTS patients (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                triage_level TEXT NOT NULL,
                heart_rate REAL NOT NULL,
                spo2 REAL NOT NULL,
                systolic_bp REAL NOT NULL,
                diastolic_bp REAL NOT NULL,
                chief_complaint TEXT,
                notes TEXT,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS medications (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                drug_name TEXT NOT NULL,
                dosage TEXT NOT NULL,
                route TEXT NOT NULL,
                status TEXT NOT NULL,
                administered_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS blood_inventory (
                unit_id TEXT PRIMARY KEY,
                blood_type TEXT NOT NULL,
                units_available INTEGER NOT NULL,
                cold_chain_temp_c REAL NOT NULL,
                expiry_date TEXT NOT NULL,
                facility_id TEXT NOT NULL,
                last_audited TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS dispatch_fleet (
                vehicle_id TEXT PRIMARY KEY,
                callsign TEXT NOT NULL,
                status TEXT NOT NULL,
                assigned_patient TEXT,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                fuel_pct REAL NOT NULL,
                updated_at TEXT NOT NULL
            );
            """)

            # 2. CDC Infrastructure Tables
            conn.executescript("""
            CREATE TABLE IF NOT EXISTS _cdc_transaction_log (
                lsn INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT UNIQUE NOT NULL,
                tx_id TEXT NOT NULL,
                source_table TEXT NOT NULL,
                op_type TEXT NOT NULL,
                record_id TEXT NOT NULL,
                before_val TEXT,
                after_val TEXT,
                captured_at TEXT NOT NULL,
                checksum TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS _cdc_checkpoints (
                consumer_id TEXT PRIMARY KEY,
                last_lsn INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS _cdc_dead_letter_queue (
                dlq_id TEXT PRIMARY KEY,
                event_id TEXT NOT NULL,
                lsn INTEGER NOT NULL,
                source_table TEXT NOT NULL,
                op_type TEXT NOT NULL,
                raw_payload TEXT NOT NULL,
                error_reason TEXT NOT NULL,
                failed_at TEXT NOT NULL,
                retry_count INTEGER DEFAULT 0,
                resolved INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS _cdc_materialized_analytics (
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                summary_json TEXT NOT NULL,
                last_lsn INTEGER NOT NULL,
                synced_at TEXT NOT NULL,
                PRIMARY KEY (entity_type, entity_id)
            );
            """)

            # 3. Create or Refresh Database Triggers for Atomic CDC Capture
            self._install_triggers(conn)

            # 4. Initialize Consumer Checkpoint if not set
            conn.execute("""
            INSERT OR IGNORE INTO _cdc_checkpoints (consumer_id, last_lsn, updated_at)
            VALUES ('kshitij_primary_replicator', 0, ?);
            """, (get_iso_now(),))

            # 5. Populate initial clinical mock records if table is pristine
            self._seed_sample_data(conn)

    def _install_triggers(self, conn: sqlite3.Connection):
        """Installs atomic triggers for all tracked source entities."""
        trigger_names = [
            "trg_cdc_patients_insert", "trg_cdc_patients_update", "trg_cdc_patients_delete",
            "trg_cdc_medications_insert", "trg_cdc_medications_update", "trg_cdc_medications_delete",
            "trg_cdc_blood_insert", "trg_cdc_blood_update", "trg_cdc_blood_delete",
            "trg_cdc_fleet_insert", "trg_cdc_fleet_update", "trg_cdc_fleet_delete",
            "trg_cdc_blood_inventory_insert", "trg_cdc_blood_inventory_update", "trg_cdc_blood_inventory_delete",
            "trg_cdc_dispatch_fleet_insert", "trg_cdc_dispatch_fleet_update", "trg_cdc_dispatch_fleet_delete"
        ]
        for trg in trigger_names:
            conn.execute(f"DROP TRIGGER IF EXISTS {trg};")

        # --- PATIENTS TRIGGERS ---
        conn.executescript("""
        CREATE TRIGGER trg_cdc_patients_insert AFTER INSERT ON patients
        BEGIN
            INSERT INTO _cdc_transaction_log (
                event_id, tx_id, source_table, op_type, record_id, before_val, after_val, captured_at, checksum
            ) VALUES (
                lower(hex(randomblob(16))),
                'tx_' || strftime('%s','now') || '_' || hex(randomblob(4)),
                'patients',
                'INSERT',
                NEW.id,
                NULL,
                json_object(
                    'id', NEW.id, 'full_name', NEW.full_name, 'triage_level', NEW.triage_level,
                    'heart_rate', NEW.heart_rate, 'spo2', NEW.spo2, 'systolic_bp', NEW.systolic_bp,
                    'diastolic_bp', NEW.diastolic_bp, 'chief_complaint', NEW.chief_complaint,
                    'notes', NEW.notes, 'updated_at', NEW.updated_at
                ),
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                substr(hex(randomblob(8)), 1, 16)
            );
        END;

        CREATE TRIGGER trg_cdc_patients_update AFTER UPDATE ON patients
        BEGIN
            INSERT INTO _cdc_transaction_log (
                event_id, tx_id, source_table, op_type, record_id, before_val, after_val, captured_at, checksum
            ) VALUES (
                lower(hex(randomblob(16))),
                'tx_' || strftime('%s','now') || '_' || hex(randomblob(4)),
                'patients',
                'UPDATE',
                NEW.id,
                json_object(
                    'id', OLD.id, 'full_name', OLD.full_name, 'triage_level', OLD.triage_level,
                    'heart_rate', OLD.heart_rate, 'spo2', OLD.spo2, 'systolic_bp', OLD.systolic_bp,
                    'diastolic_bp', OLD.diastolic_bp, 'chief_complaint', OLD.chief_complaint,
                    'notes', OLD.notes, 'updated_at', OLD.updated_at
                ),
                json_object(
                    'id', NEW.id, 'full_name', NEW.full_name, 'triage_level', NEW.triage_level,
                    'heart_rate', NEW.heart_rate, 'spo2', NEW.spo2, 'systolic_bp', NEW.systolic_bp,
                    'diastolic_bp', NEW.diastolic_bp, 'chief_complaint', NEW.chief_complaint,
                    'notes', NEW.notes, 'updated_at', NEW.updated_at
                ),
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                substr(hex(randomblob(8)), 1, 16)
            );
        END;

        CREATE TRIGGER trg_cdc_patients_delete AFTER DELETE ON patients
        BEGIN
            INSERT INTO _cdc_transaction_log (
                event_id, tx_id, source_table, op_type, record_id, before_val, after_val, captured_at, checksum
            ) VALUES (
                lower(hex(randomblob(16))),
                'tx_' || strftime('%s','now') || '_' || hex(randomblob(4)),
                'patients',
                'DELETE',
                OLD.id,
                json_object(
                    'id', OLD.id, 'full_name', OLD.full_name, 'triage_level', OLD.triage_level,
                    'heart_rate', OLD.heart_rate, 'spo2', OLD.spo2, 'systolic_bp', OLD.systolic_bp,
                    'diastolic_bp', OLD.diastolic_bp, 'chief_complaint', OLD.chief_complaint,
                    'notes', OLD.notes, 'updated_at', OLD.updated_at
                ),
                NULL,
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                substr(hex(randomblob(8)), 1, 16)
            );
        END;
        """)

        # --- MEDICATIONS TRIGGERS ---
        conn.executescript("""
        CREATE TRIGGER trg_cdc_medications_insert AFTER INSERT ON medications
        BEGIN
            INSERT INTO _cdc_transaction_log (
                event_id, tx_id, source_table, op_type, record_id, before_val, after_val, captured_at, checksum
            ) VALUES (
                lower(hex(randomblob(16))),
                'tx_' || strftime('%s','now') || '_' || hex(randomblob(4)),
                'medications',
                'INSERT',
                NEW.id,
                NULL,
                json_object(
                    'id', NEW.id, 'patient_id', NEW.patient_id, 'drug_name', NEW.drug_name,
                    'dosage', NEW.dosage, 'route', NEW.route, 'status', NEW.status,
                    'administered_at', NEW.administered_at
                ),
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                substr(hex(randomblob(8)), 1, 16)
            );
        END;

        CREATE TRIGGER trg_cdc_medications_update AFTER UPDATE ON medications
        BEGIN
            INSERT INTO _cdc_transaction_log (
                event_id, tx_id, source_table, op_type, record_id, before_val, after_val, captured_at, checksum
            ) VALUES (
                lower(hex(randomblob(16))),
                'tx_' || strftime('%s','now') || '_' || hex(randomblob(4)),
                'medications',
                'UPDATE',
                NEW.id,
                json_object(
                    'id', OLD.id, 'patient_id', OLD.patient_id, 'drug_name', OLD.drug_name,
                    'dosage', OLD.dosage, 'route', OLD.route, 'status', OLD.status,
                    'administered_at', OLD.administered_at
                ),
                json_object(
                    'id', NEW.id, 'patient_id', NEW.patient_id, 'drug_name', NEW.drug_name,
                    'dosage', NEW.dosage, 'route', NEW.route, 'status', NEW.status,
                    'administered_at', NEW.administered_at
                ),
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                substr(hex(randomblob(8)), 1, 16)
            );
        END;

        CREATE TRIGGER trg_cdc_medications_delete AFTER DELETE ON medications
        BEGIN
            INSERT INTO _cdc_transaction_log (
                event_id, tx_id, source_table, op_type, record_id, before_val, after_val, captured_at, checksum
            ) VALUES (
                lower(hex(randomblob(16))),
                'tx_' || strftime('%s','now') || '_' || hex(randomblob(4)),
                'medications',
                'DELETE',
                OLD.id,
                json_object(
                    'id', OLD.id, 'patient_id', OLD.patient_id, 'drug_name', OLD.drug_name,
                    'dosage', OLD.dosage, 'route', OLD.route, 'status', OLD.status,
                    'administered_at', OLD.administered_at
                ),
                NULL,
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                substr(hex(randomblob(8)), 1, 16)
            );
        END;
        """)

        # --- BLOOD_INVENTORY TRIGGERS ---
        conn.executescript("""
        CREATE TRIGGER trg_cdc_blood_insert AFTER INSERT ON blood_inventory
        BEGIN
            INSERT INTO _cdc_transaction_log (
                event_id, tx_id, source_table, op_type, record_id, before_val, after_val, captured_at, checksum
            ) VALUES (
                lower(hex(randomblob(16))),
                'tx_' || strftime('%s','now') || '_' || hex(randomblob(4)),
                'blood_inventory',
                'INSERT',
                NEW.unit_id,
                NULL,
                json_object(
                    'unit_id', NEW.unit_id, 'blood_type', NEW.blood_type, 'units_available', NEW.units_available,
                    'cold_chain_temp_c', NEW.cold_chain_temp_c, 'expiry_date', NEW.expiry_date,
                    'facility_id', NEW.facility_id, 'last_audited', NEW.last_audited
                ),
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                substr(hex(randomblob(8)), 1, 16)
            );
        END;

        CREATE TRIGGER trg_cdc_blood_update AFTER UPDATE ON blood_inventory
        BEGIN
            INSERT INTO _cdc_transaction_log (
                event_id, tx_id, source_table, op_type, record_id, before_val, after_val, captured_at, checksum
            ) VALUES (
                lower(hex(randomblob(16))),
                'tx_' || strftime('%s','now') || '_' || hex(randomblob(4)),
                'blood_inventory',
                'UPDATE',
                NEW.unit_id,
                json_object(
                    'unit_id', OLD.unit_id, 'blood_type', OLD.blood_type, 'units_available', OLD.units_available,
                    'cold_chain_temp_c', OLD.cold_chain_temp_c, 'expiry_date', OLD.expiry_date,
                    'facility_id', OLD.facility_id, 'last_audited', OLD.last_audited
                ),
                json_object(
                    'unit_id', NEW.unit_id, 'blood_type', NEW.blood_type, 'units_available', NEW.units_available,
                    'cold_chain_temp_c', NEW.cold_chain_temp_c, 'expiry_date', NEW.expiry_date,
                    'facility_id', NEW.facility_id, 'last_audited', NEW.last_audited
                ),
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                substr(hex(randomblob(8)), 1, 16)
            );
        END;

        CREATE TRIGGER trg_cdc_blood_delete AFTER DELETE ON blood_inventory
        BEGIN
            INSERT INTO _cdc_transaction_log (
                event_id, tx_id, source_table, op_type, record_id, before_val, after_val, captured_at, checksum
            ) VALUES (
                lower(hex(randomblob(16))),
                'tx_' || strftime('%s','now') || '_' || hex(randomblob(4)),
                'blood_inventory',
                'DELETE',
                OLD.unit_id,
                json_object(
                    'unit_id', OLD.unit_id, 'blood_type', OLD.blood_type, 'units_available', OLD.units_available,
                    'cold_chain_temp_c', OLD.cold_chain_temp_c, 'expiry_date', OLD.expiry_date,
                    'facility_id', OLD.facility_id, 'last_audited', OLD.last_audited
                ),
                NULL,
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                substr(hex(randomblob(8)), 1, 16)
            );
        END;
        """)

        # --- DISPATCH_FLEET TRIGGERS ---
        conn.executescript("""
        CREATE TRIGGER trg_cdc_fleet_insert AFTER INSERT ON dispatch_fleet
        BEGIN
            INSERT INTO _cdc_transaction_log (
                event_id, tx_id, source_table, op_type, record_id, before_val, after_val, captured_at, checksum
            ) VALUES (
                lower(hex(randomblob(16))),
                'tx_' || strftime('%s','now') || '_' || hex(randomblob(4)),
                'dispatch_fleet',
                'INSERT',
                NEW.vehicle_id,
                NULL,
                json_object(
                    'vehicle_id', NEW.vehicle_id, 'callsign', NEW.callsign, 'status', NEW.status,
                    'assigned_patient', NEW.assigned_patient, 'lat', NEW.lat, 'lng', NEW.lng,
                    'fuel_pct', NEW.fuel_pct, 'updated_at', NEW.updated_at
                ),
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                substr(hex(randomblob(8)), 1, 16)
            );
        END;

        CREATE TRIGGER trg_cdc_fleet_update AFTER UPDATE ON dispatch_fleet
        BEGIN
            INSERT INTO _cdc_transaction_log (
                event_id, tx_id, source_table, op_type, record_id, before_val, after_val, captured_at, checksum
            ) VALUES (
                lower(hex(randomblob(16))),
                'tx_' || strftime('%s','now') || '_' || hex(randomblob(4)),
                'dispatch_fleet',
                'UPDATE',
                NEW.vehicle_id,
                json_object(
                    'vehicle_id', OLD.vehicle_id, 'callsign', OLD.callsign, 'status', OLD.status,
                    'assigned_patient', OLD.assigned_patient, 'lat', OLD.lat, 'lng', OLD.lng,
                    'fuel_pct', OLD.fuel_pct, 'updated_at', OLD.updated_at
                ),
                json_object(
                    'vehicle_id', NEW.vehicle_id, 'callsign', NEW.callsign, 'status', NEW.status,
                    'assigned_patient', NEW.assigned_patient, 'lat', NEW.lat, 'lng', NEW.lng,
                    'fuel_pct', NEW.fuel_pct, 'updated_at', NEW.updated_at
                ),
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                substr(hex(randomblob(8)), 1, 16)
            );
        END;

        CREATE TRIGGER trg_cdc_fleet_delete AFTER DELETE ON dispatch_fleet
        BEGIN
            INSERT INTO _cdc_transaction_log (
                event_id, tx_id, source_table, op_type, record_id, before_val, after_val, captured_at, checksum
            ) VALUES (
                lower(hex(randomblob(16))),
                'tx_' || strftime('%s','now') || '_' || hex(randomblob(4)),
                'dispatch_fleet',
                'DELETE',
                OLD.vehicle_id,
                json_object(
                    'vehicle_id', OLD.vehicle_id, 'callsign', OLD.callsign, 'status', OLD.status,
                    'assigned_patient', OLD.assigned_patient, 'lat', OLD.lat, 'lng', OLD.lng,
                    'fuel_pct', OLD.fuel_pct, 'updated_at', OLD.updated_at
                ),
                NULL,
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                substr(hex(randomblob(8)), 1, 16)
            );
        END;
        """)

    def _seed_sample_data(self, conn: sqlite3.Connection):
        """Seeds initial clinical state if database is empty."""
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM patients;")
        count = cursor.fetchone()[0]
        if count == 0:
            now = get_iso_now()
            # Insert initial patients
            patients_data = [
                ("PT-901", "Marcus Vance", "IMMEDIATE", 128.0, 89.0, 90.0, 58.0, "Traumatic Chest Contusion", "Combat casualty from Sector 4", now),
                ("PT-902", "Elena Rostova", "DELAYED", 84.0, 97.0, 118.0, 76.0, "Compound Fracture Left Radius", "Splinted on field, stable vitals", now),
                ("PT-903", "Kaelen Chen", "MINIMAL", 72.0, 99.0, 122.0, 80.0, "Superficial Shrapnel Lacerations", "Debrided and dressed at triage bay", now),
            ]
            conn.executemany("""
            INSERT INTO patients (id, full_name, triage_level, heart_rate, spo2, systolic_bp, diastolic_bp, chief_complaint, notes, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, patients_data)

            # Insert initial blood units
            blood_data = [
                ("BLD-O-NEG-01", "O_NEG", 14, 3.8, "2026-11-15", "FST-ALPHA", now),
                ("BLD-A-POS-04", "A_POS", 22, 4.1, "2026-11-20", "FST-ALPHA", now),
                ("BLD-B-POS-02", "B_POS", 18, 3.9, "2026-11-18", "FST-ALPHA", now),
            ]
            conn.executemany("""
            INSERT INTO blood_inventory (unit_id, blood_type, units_available, cold_chain_temp_c, expiry_date, facility_id, last_audited)
            VALUES (?, ?, ?, ?, ?, ?, ?);
            """, blood_data)

            # Insert initial fleet
            fleet_data = [
                ("AMB-ALPHA-01", "MEDEVAC-1", "EN_ROUTE", "PT-901", 12.871773, 77.576856, 88.5, now),
                ("AMB-BRAVO-02", "MEDEVAC-2", "IDLE_STATION", None, 12.875200, 77.580100, 95.0, now),
            ]
            conn.executemany("""
            INSERT INTO dispatch_fleet (vehicle_id, callsign, status, assigned_patient, lat, lng, fuel_pct, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """, fleet_data)


# Instantiate default manager singleton
cdc_db = CdcDatabaseManager()
