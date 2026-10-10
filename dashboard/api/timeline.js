export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json([
    {
      "id": "INC-101",
      "timestamp": "06:12:44",
      "patient_id": "PT-101",
      "category": "VITALS_CRITICAL",
      "title": "Critical Hypoxia Spike (PT-101)",
      "details": "SpO2 plummeted to 86.0%. Pulse: 138.0 bpm with tension pneumothorax red flag.",
      "conflict_detected": false,
      "resolution": null
    },
    {
      "id": "INC-102",
      "timestamp": "06:11:15",
      "patient_id": "PT-101",
      "category": "CONFLICT_RESOLVED",
      "title": "Duplicate Medication Admin Detected: Fentanyl",
      "details": "Duplicate record detected: 'Fentanyl 100mcg' recorded by Paramedic Sierra matches record by Medic Echo at 14:15.",
      "conflict_detected": true,
      "resolution": "Nirantara Conflict Resolution: Merged duplicate log into single administration dose to prevent double-counting."
    },
    {
      "id": "INC-103",
      "timestamp": "06:09:50",
      "patient_id": "PT-102",
      "category": "VITALS_CRITICAL",
      "title": "Hypovolemic Shock Alert (PT-102)",
      "details": "Systolic BP dropped to 78/48 mmHg; Heart rate spiked to 142 bpm. Internal hemorrhage active.",
      "conflict_detected": false,
      "resolution": "Massive transfusion protocol initiated with Manipal Blood Bank."
    },
    {
      "id": "INC-104",
      "timestamp": "06:08:22",
      "patient_id": "PT-412",
      "category": "SECURITY_ALERT",
      "title": "Tampered Capsule Signature Detected for PT-412",
      "details": "HMAC-SHA256 signature verification failed over insecure RF field link. Hash altered in transit.",
      "conflict_detected": true,
      "resolution": "Capsule marked as TAMPERED; quarantined for manual cryptographic review."
    },
    {
      "id": "INC-105",
      "timestamp": "06:07:05",
      "patient_id": "PT-412",
      "category": "EYE_GAZE_ALERT",
      "title": "Eye-Gaze Command: BATHROOM",
      "details": "EOG detected 1 blink, direction RIGHT. Verification: TAMPERED.",
      "conflict_detected": true,
      "resolution": "Suspended pending re-auth"
    },
    {
      "id": "INC-106",
      "timestamp": "06:05:40",
      "patient_id": "PT-309",
      "category": "EYE_GAZE_ALERT",
      "title": "Eye-Gaze Command: CALL_NURSE",
      "details": "EOG detected 2 blinks, direction CENTER. Verification: VERIFIED.",
      "conflict_detected": false,
      "resolution": "Action dispatched to Command Hospital Air Force bedside operator."
    },
    {
      "id": "INC-107",
      "timestamp": "06:04:12",
      "patient_id": "PT-102",
      "category": "MEDICATION_ADMIN",
      "title": "Medication Administered: Tranexamic Acid (1g IV)",
      "details": "Administered by Dr. Nair at 14:20 for trauma-induced coagulopathy control.",
      "conflict_detected": false,
      "resolution": null
    },
    {
      "id": "INC-108",
      "timestamp": "06:02:30",
      "patient_id": "PT-620",
      "category": "VITALS_CRITICAL",
      "title": "Acute STEMI / Hypertensive Crisis (PT-620)",
      "details": "ST-Elevation on 12-lead telemetry; BP 168/104 mmHg, HR 128 bpm.",
      "conflict_detected": false,
      "resolution": "Cardiac cath lab prep alerted at Manipal Command Center Bed #03."
    },
    {
      "id": "INC-109",
      "timestamp": "05:59:18",
      "patient_id": "PT-204",
      "category": "CONFLICT_RESOLVED",
      "title": "Overlapping Antibiotic Dosing Resolved: Ceftriaxone",
      "details": "Ceftriaxone 1g IV recorded concurrently across disconnected field nodes during RF blackout.",
      "conflict_detected": true,
      "resolution": "Single valid dose reconciled via sequence timestamp deterministic merge."
    },
    {
      "id": "INC-110",
      "timestamp": "05:58:04",
      "patient_id": "PT-204",
      "category": "EYE_GAZE_ALERT",
      "title": "Eye-Gaze Command: WATER",
      "details": "EOG detected 1 blink, direction LEFT. Verification: VERIFIED.",
      "conflict_detected": false,
      "resolution": "Action dispatched to bedside operator."
    },
    {
      "id": "INC-111",
      "timestamp": "05:55:42",
      "patient_id": "PT-215",
      "category": "MEDICATION_ADMIN",
      "title": "Medication Administered: Albuterol Nebulizer (5mg)",
      "details": "Administered by Medic Bravo at 14:00 for smoke inhalation bronchospasm.",
      "conflict_detected": false,
      "resolution": null
    },
    {
      "id": "INC-112",
      "timestamp": "05:52:10",
      "patient_id": "PT-101",
      "category": "EYE_GAZE_ALERT",
      "title": "Eye-Gaze Command: PAIN",
      "details": "EOG detected 3 blinks, direction CENTER. Verification: VERIFIED.",
      "conflict_detected": false,
      "resolution": "Action dispatched to bedside operator."
    },
    {
      "id": "INC-113",
      "timestamp": "05:50:00",
      "patient_id": "SYSTEM",
      "category": "SYNC_DEDUPLICATION",
      "title": "Offline Batch Replay Reconciled (18 Packets)",
      "details": "Autonomous delta synchronization merged 18 offline sensor records with zero database collisions.",
      "conflict_detected": false,
      "resolution": "100% cryptographic checksum verification completed."
    },
    {
      "id": "INC-114",
      "timestamp": "05:46:25",
      "patient_id": "SYSTEM",
      "category": "SECURITY_ALERT",
      "title": "Dual-Path RF Network Failover Engaged",
      "details": "Port A Primary RTT spiked to 48.2ms; seamless sub-500ms failover transitioned to Port B Backup.",
      "conflict_detected": false,
      "resolution": "TinyML Auto-reroute stabilized telemetry stream."
    }
  ]);
}
