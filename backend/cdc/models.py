"""
Change Data Capture (CDC) Pydantic Models.
Defines schemas for transactional events, metadata, pipeline metrics, and control signals.
"""

from enum import Enum
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class CdcOperation(str, Enum):
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    SNAPSHOT = "SNAPSHOT"


class CdcEventStatus(str, Enum):
    CAPTURED = "CAPTURED"
    COMMITTED = "COMMITTED"
    DLQ = "DLQ"
    RETRYING = "RETRYING"
    SKIPPED_DUPLICATE = "SKIPPED_DUPLICATE"


class CdcEventMetadata(BaseModel):
    event_id: str = Field(..., description="Unique deduplication key UUID")
    lsn: int = Field(..., description="Log Sequence Number from transactional journal")
    tx_id: str = Field(..., description="Database transaction identifier")
    source_db: str = Field(default="kshitij_clinical.db")
    source_table: str = Field(..., description="Source entity table name")
    record_id: str = Field(..., description="Primary key of modified record")
    op_type: CdcOperation = Field(..., description="Database mutation type")
    captured_at: str = Field(..., description="ISO8601 timestamp of source commit")
    processed_at: Optional[str] = Field(default=None, description="ISO8601 timestamp of pipeline sink")
    schema_version: str = Field(default="1.0.0")
    checksum: str = Field(..., description="SHA-256 payload integrity hash")


class CdcEvent(BaseModel):
    metadata: CdcEventMetadata
    before: Optional[Dict[str, Any]] = Field(default=None, description="Pre-image state (None for INSERT)")
    after: Optional[Dict[str, Any]] = Field(default=None, description="Post-image state (None for DELETE)")
    redacted_fields: List[str] = Field(default_factory=list, description="List of masked PHI fields")
    status: CdcEventStatus = Field(default=CdcEventStatus.CAPTURED)
    retry_count: int = Field(default=0)
    error_message: Optional[str] = Field(default=None)


class DeadLetterRecord(BaseModel):
    dlq_id: str
    event_id: str
    lsn: int
    source_table: str
    op_type: str
    raw_payload: str
    error_reason: str
    failed_at: str
    retry_count: int
    resolved: bool = False


class CdcComponentHealth(BaseModel):
    name: str
    status: str  # "HEALTHY", "DEGRADED", "OFFLINE"
    details: str
    latency_ms: float
    last_check: str


class CdcPipelineStatus(BaseModel):
    state: str  # "RUNNING", "PAUSED", "DEGRADED", "FAILED"
    source_db: str
    destinations: List[str]
    current_lsn: int
    checkpoint_lsn: int
    lag_events: int
    total_captured: int
    total_processed: int
    total_dlq: int
    avg_latency_ms: float
    last_event_time: Optional[str] = None
    components: List[CdcComponentHealth] = Field(default_factory=list)
    monitored_tables: List[str] = Field(default_factory=list)


class CdcControlRequest(BaseModel):
    action: str = Field(..., description="'pause', 'resume', 'trigger_snapshot', 'retry_dlq', 'clear_dlq', 'purge_logs'")
    table_filter: Optional[str] = None


class CdcSimulateCrudRequest(BaseModel):
    table: str = Field(..., description="Target table: 'patients', 'medications', 'blood_inventory', 'dispatch_fleet'")
    op: str = Field(..., description="'insert', 'update', 'delete', 'poison'")
    record_id: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
