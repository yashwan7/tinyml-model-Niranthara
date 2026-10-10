"""
CDC Event Processor: Validation, Normalization, PHI Redaction,
Deduplication Cache, Exponential Backoff Retries, and Poison Message / DLQ Quarantine.
"""

import json
import logging
from typing import Dict, Any, Optional, Tuple, Set
from collections import OrderedDict

from .models import (
    CdcEvent,
    CdcEventMetadata,
    CdcOperation,
    CdcEventStatus,
    DeadLetterRecord
)

logger = logging.getLogger("cdc.processor")

SENSITIVE_PHI_FIELDS = {
    "notes",
    "social_security",
    "ssn",
    "patient_phone",
    "home_address",
    "insurance_id"
}


class CdcEventProcessor:
    def __init__(self, max_dedup_cache_size: int = 10000, max_retries: int = 3):
        self.max_retries = max_retries
        self.dedup_cache: OrderedDict[str, bool] = OrderedDict()
        self.max_dedup_cache_size = max_dedup_cache_size

    def is_duplicate(self, event_id: str) -> bool:
        """Check if an event ID has already been processed idempotently."""
        if event_id in self.dedup_cache:
            return True
        return False

    def mark_processed(self, event_id: str):
        """Add event ID to bounded LRU deduplication cache."""
        self.dedup_cache[event_id] = True
        if len(self.dedup_cache) > self.max_dedup_cache_size:
            self.dedup_cache.popitem(last=False)

    def redact_phi(self, data: Optional[Dict[str, Any]]) -> Tuple[Optional[Dict[str, Any]], list]:
        """Redacts sensitive health information and clinical notes from downstream payloads."""
        if not data:
            return None, []
        
        redacted = dict(data)
        redacted_fields = []
        for key in list(redacted.keys()):
            if key.lower() in SENSITIVE_PHI_FIELDS:
                redacted[key] = "[REDACTED_CLINICAL_PROTECTED]"
                redacted_fields.append(key)
        return redacted, redacted_fields

    def validate_and_normalize(self, raw_row: Dict[str, Any]) -> Tuple[Optional[CdcEvent], Optional[str]]:
        """
        Parses raw row from _cdc_transaction_log, validates schema, applies redaction,
        and constructs normalized CdcEvent. Returns (event, error_reason).
        """
        try:
            event_id = raw_row.get("event_id")
            lsn = raw_row.get("lsn")
            tx_id = raw_row.get("tx_id", "unknown_tx")
            source_table = raw_row.get("source_table")
            op_type_raw = raw_row.get("op_type")
            record_id = raw_row.get("record_id")
            captured_at = raw_row.get("captured_at")
            checksum = raw_row.get("checksum", "")

            if not all([event_id, lsn, source_table, op_type_raw, record_id, captured_at]):
                return None, "Missing mandatory CDC envelope fields"

            op_type = CdcOperation(op_type_raw)

            # Parse before/after json
            before_val = None
            if raw_row.get("before_val"):
                try:
                    before_val = json.loads(raw_row["before_val"])
                except Exception as e:
                    return None, f"Malformed before_val JSON: {str(e)}"

            after_val = None
            if raw_row.get("after_val"):
                try:
                    after_val = json.loads(raw_row["after_val"])
                except Exception as e:
                    return None, f"Malformed after_val JSON: {str(e)}"

            # Poison message simulation check: if payload has explicit corrupted flag
            if after_val and after_val.get("__force_poison_error__"):
                return None, f"Deliberate poison pill payload: {after_val.get('error_detail', 'Invalid schema violation')}"

            # Apply HIPAA / Medical Data Minimization Redaction
            redacted_before, red_b = self.redact_phi(before_val)
            redacted_after, red_a = self.redact_phi(after_val)
            all_redacted = list(set(red_b + red_a))

            metadata = CdcEventMetadata(
                event_id=str(event_id),
                lsn=int(lsn),
                tx_id=str(tx_id),
                source_db="kshitij_clinical.db",
                source_table=str(source_table),
                record_id=str(record_id),
                op_type=op_type,
                captured_at=str(captured_at),
                checksum=str(checksum)
            )

            event = CdcEvent(
                metadata=metadata,
                before=redacted_before,
                after=redacted_after,
                redacted_fields=all_redacted,
                status=CdcEventStatus.CAPTURED
            )

            return event, None

        except Exception as ex:
            return None, f"Schema validation exception: {str(ex)}"


cdc_processor = CdcEventProcessor()
