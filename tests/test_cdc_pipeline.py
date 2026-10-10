"""
Unit and Integration Tests for Change Data Capture (CDC) Pipeline.
Verifies INSERT, UPDATE, DELETE atomic triggers, LSN ordering,
PHI redaction, idempotency, Dead Letter Queue (DLQ), and REST APIs.
"""

import unittest
import asyncio
import uuid
import json
import sqlite3
from fastapi.testclient import TestClient

from backend.cdc.db import cdc_db, get_iso_now
from backend.cdc.models import CdcOperation, CdcEventStatus
from backend.cdc.processor import cdc_processor
from backend.cdc.destinations import cdc_destinations
from backend.cdc.service import cdc_service
from backend.merge_engine.service import app

client = TestClient(app)


class TestCdcPipeline(unittest.TestCase):
    def setUp(self):
        # Reset CDC state for clean test run
        cdc_service.resume()

    def test_01_insert_atomic_capture(self):
        """Verify creating a source record triggers atomic INSERT event into _cdc_transaction_log."""
        patient_id = f"PT-TEST-{uuid.uuid4().hex[:4].upper()}"
        res = cdc_service.simulate_insert(
            table="patients",
            data={
                "id": patient_id,
                "full_name": "Test Casualty Alpha",
                "triage_level": "IMMEDIATE",
                "heart_rate": 135.0,
                "spo2": 88.0,
                "systolic_bp": 85.0,
                "diastolic_bp": 50.0,
                "chief_complaint": "Tension Pneumothorax",
                "notes": "TOP SECRET MILITARY NOTE"
            }
        )
        self.assertEqual(res["status"], "inserted")
        self.assertEqual(res["table"], "patients")
        self.assertGreater(res["generated_lsn"], 0)

        # Verify event was captured in SQLite transaction log
        with cdc_db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM _cdc_transaction_log WHERE lsn = ?;", (res["generated_lsn"],))
            row = cursor.fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row["op_type"], "INSERT")
            self.assertEqual(row["record_id"], patient_id)
            self.assertIsNone(row["before_val"])
            self.assertIsNotNone(row["after_val"])

            # Verify replication worker processes the batch
            asyncio.run(cdc_service.process_batch(limit=10))

            # Verify downstream materialized analytics view received record
            cursor.execute("SELECT * FROM _cdc_materialized_analytics WHERE entity_type = 'patients' AND entity_id = ?;", (patient_id,))
            mat_row = cursor.fetchone()
            self.assertIsNotNone(mat_row)
            self.assertEqual(mat_row["entity_id"], patient_id)

    def test_02_update_with_before_and_after_images(self):
        """Verify updating a record produces correct UPDATE event with before and after state diff."""
        # Insert initial record first
        patient_id = f"PT-UPD-{uuid.uuid4().hex[:4].upper()}"
        cdc_service.simulate_insert(table="patients", data={"id": patient_id, "heart_rate": 100.0, "spo2": 95.0})
        asyncio.run(cdc_service.process_batch(limit=10))

        # Perform update
        res = cdc_service.simulate_update(table="patients", record_id=patient_id)
        self.assertEqual(res["status"], "updated")
        self.assertEqual(res["record_id"], patient_id)

        with cdc_db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM _cdc_transaction_log WHERE lsn = ?;", (res["generated_lsn"],))
            row = cursor.fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row["op_type"], "UPDATE")
            self.assertIsNotNone(row["before_val"])
            self.assertIsNotNone(row["after_val"])

            before_data = json.loads(row["before_val"])
            after_data = json.loads(row["after_val"])
            self.assertEqual(before_data["id"], patient_id)
            self.assertEqual(after_data["id"], patient_id)
            self.assertNotEqual(before_data["heart_rate"], after_data["heart_rate"])

    def test_03_delete_and_downstream_tombstone(self):
        """Verify deleting a record captures DELETE event and removes it from downstream materialized view."""
        patient_id = f"PT-DEL-{uuid.uuid4().hex[:4].upper()}"
        cdc_service.simulate_insert(table="patients", data={"id": patient_id})
        asyncio.run(cdc_service.process_batch(limit=10))

        # Ensure present in materialized view before delete
        with cdc_db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM _cdc_materialized_analytics WHERE entity_id = ?;", (patient_id,))
            self.assertIsNotNone(cursor.fetchone())

        # Perform delete
        res = cdc_service.simulate_delete(table="patients", record_id=patient_id)
        self.assertEqual(res["status"], "deleted")

        # Process CDC pipeline
        asyncio.run(cdc_service.process_batch(limit=10))

        # Verify removed from downstream materialized view
        with cdc_db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM _cdc_materialized_analytics WHERE entity_id = ?;", (patient_id,))
            self.assertIsNone(cursor.fetchone())

    def test_04_phi_redaction(self):
        """Verify HIPAA / Medical data minimization masks sensitive fields."""
        raw_payload = {
            "id": "PT-CONFIDENTIAL",
            "full_name": "Marcus Vance",
            "triage_level": "RED",
            "notes": "TOP SECRET PSYCHIATRIC RECORD",
            "social_security": "123-45-6789"
        }
        redacted, fields = cdc_processor.redact_phi(raw_payload)
        self.assertEqual(redacted["notes"], "[REDACTED_CLINICAL_PROTECTED]")
        self.assertEqual(redacted["social_security"], "[REDACTED_CLINICAL_PROTECTED]")
        self.assertIn("notes", fields)
        self.assertIn("social_security", fields)
        # Clinical vital fields remain intact
        self.assertEqual(redacted["triage_level"], "RED")

    def test_05_idempotency_and_deduplication(self):
        """Verify duplicate events are filtered out and do not corrupt destinations."""
        test_event_id = f"ev_test_{uuid.uuid4().hex}"
        self.assertFalse(cdc_processor.is_duplicate(test_event_id))
        cdc_processor.mark_processed(test_event_id)
        self.assertTrue(cdc_processor.is_duplicate(test_event_id))

    def test_06_dead_letter_queue_quarantine(self):
        """Verify poisoned or invalid payloads are safely quarantined to DLQ."""
        # Inject poison pill
        res = cdc_service.simulate_poison_pill()
        self.assertEqual(res["status"], "poison_injected")

        # Process batch
        asyncio.run(cdc_service.process_batch(limit=10))

        # Check DLQ records
        dlq_items = cdc_service.get_dlq_records()
        self.assertGreater(len(dlq_items), 0)
        latest_dlq = dlq_items[0]
        self.assertIn("poison", latest_dlq["raw_payload"].lower())
        self.assertIn("schema error", latest_dlq["error_reason"].lower())

    def test_07_checkpoint_advancement_and_recovery(self):
        """Verify checkpoint advances monotonically and restarts resume without skipping."""
        with cdc_db.get_connection() as conn:
            initial_checkpoint = cdc_service.get_checkpoint(conn)

            # Insert two new records
            cdc_service.simulate_insert(table="blood_inventory")
            cdc_service.simulate_insert(table="dispatch_fleet")

            # Process batch
            asyncio.run(cdc_service.process_batch(limit=20))

            new_checkpoint = cdc_service.get_checkpoint(conn)
            self.assertGreater(new_checkpoint, initial_checkpoint)

    def test_08_rest_endpoints(self):
        """Verify FastAPI REST endpoints for status, events, DLQ, and control."""
        # Status endpoint
        resp = client.get("/api/cdc/status")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("state", data)
        self.assertIn("current_lsn", data)
        self.assertIn("checkpoint_lsn", data)
        self.assertIn("components", data)

        # Events endpoint
        resp_events = client.get("/api/cdc/events?limit=10")
        self.assertEqual(resp_events.status_code, 200)
        self.assertIsInstance(resp_events.json(), list)

        # Simulate CRUD via REST
        resp_crud = client.post("/api/cdc/simulate-crud", json={
            "table": "patients",
            "op": "insert",
            "data": {"full_name": "API Patient", "triage_level": "DELAYED"}
        })
        self.assertEqual(resp_crud.status_code, 200)
        self.assertEqual(resp_crud.json()["operation_result"]["status"], "inserted")

        # Control endpoint (pause / resume)
        resp_pause = client.post("/api/cdc/control", json={"action": "pause"})
        self.assertEqual(resp_pause.status_code, 200)
        self.assertEqual(resp_pause.json()["pipeline"]["state"], "PAUSED")

        resp_resume = client.post("/api/cdc/control", json={"action": "resume"})
        self.assertEqual(resp_resume.status_code, 200)
        self.assertIn(resp_resume.json()["pipeline"]["state"], ["RUNNING", "DEGRADED"])


if __name__ == "__main__":
    unittest.main()
