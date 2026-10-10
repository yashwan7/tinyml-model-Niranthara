/**
 * Kshitij Tactical EMR - Clinical Datasets & Audit Timeline Fixtures
 * Comprehensive multi-casualty trauma, triage queue, and EMR audit data.
 * Anchored to Bengaluru emergency response coordinates.
 */

export const DEFAULT_PATIENTS_FIXTURE = [
  {
    capsule: {
      patient_id: "PT-101",
      patient_name: "Sgt. Marcus Vance",
      age: 34,
      gender: "M",
      timestamp: Date.now() / 1000 - 120,
      time_to_help: 0.4, // ~24 mins
      vitals: {
        heart_rate: 138.0,
        spo2: 86.0,
        systolic_bp: 88.0,
        diastolic_bp: 56.0,
        respiratory_rate: 34.0,
        temperature: 36.4,
        bed_force: 1950.0,
        fall_detected: true
      },
      red_flags: ["tension_pneumothorax", "penetrating_chest_trauma", "severe_hypoxemia"],
      eye_gaze: {
        command: "PAIN",
        direction: "CENTER",
        blink_count: 3,
        timestamp: Date.now() / 1000 - 60
      },
      medications: [
        { medication: "Fentanyl", dose: "100mcg", administered_at: "14:15", administered_by: "Medic Echo", entry_id: "M1" }
      ],
      gps: { lat: 12.871773, lng: 77.576856, altitude: 920.0 },
      triage_color: "RED",
      delta_fields: [],
      offline_cached: true,
      sequence_id: 12,
      hmac_signature: "6638b6da6d29fad480937e6c98253872f2bdc248c8a9768a6da3f0b3d18c548c",
      verification_status: "VERIFIED"
    },
    metrics: { severity: 10.0, time_sensitivity: 2.5, time_to_help: 0.4, priority_score: 62.5 },
    priority_score: 62.5,
    triage_badge: "RED"
  },
  {
    capsule: {
      patient_id: "PT-102",
      patient_name: "Dr. Ananya Sengupta",
      age: 29,
      gender: "F",
      timestamp: Date.now() / 1000 - 180,
      time_to_help: 0.5,
      vitals: {
        heart_rate: 142.0,
        spo2: 84.0,
        systolic_bp: 78.0,
        diastolic_bp: 48.0,
        respiratory_rate: 36.0,
        temperature: 35.8,
        bed_force: 1420.0,
        fall_detected: true
      },
      red_flags: ["massive_pelvic_fracture", "hypovolemic_shock", "internal_hemorrhage"],
      eye_gaze: {
        command: "HELP",
        direction: "UP",
        blink_count: 2,
        timestamp: Date.now() / 1000 - 90
      },
      medications: [
        { medication: "Tranexamic Acid", dose: "1g IV", administered_at: "14:20", administered_by: "Dr. Nair", entry_id: "M2" },
        { medication: "O-Negative RBC", dose: "2 Units", administered_at: "14:24", administered_by: "Medic Sierra", entry_id: "M3" }
      ],
      gps: { lat: 12.874500, lng: 77.576800, altitude: 918.0 },
      triage_color: "RED",
      delta_fields: [],
      offline_cached: false,
      sequence_id: 8,
      hmac_signature: "e7492c108f9a2b4d5e6c7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
      verification_status: "VERIFIED"
    },
    metrics: { severity: 9.6, time_sensitivity: 2.8, time_to_help: 0.5, priority_score: 58.2 },
    priority_score: 58.2,
    triage_badge: "RED"
  },
  {
    capsule: {
      patient_id: "PT-620",
      patient_name: "Sub-Inspector Arun Kumar",
      age: 49,
      gender: "M",
      timestamp: Date.now() / 1000 - 240,
      time_to_help: 0.6,
      vitals: {
        heart_rate: 128.0,
        spo2: 89.0,
        systolic_bp: 168.0,
        diastolic_bp: 104.0,
        respiratory_rate: 28.0,
        temperature: 37.2,
        bed_force: 2250.0,
        fall_detected: false
      },
      red_flags: ["acute_stemi_infarction", "cardiogenic_pre_shock", "chest_pressure_severe"],
      eye_gaze: null,
      medications: [
        { medication: "Aspirin", dose: "325mg PO", administered_at: "14:05", administered_by: "Medic Alpha", entry_id: "M4" },
        { medication: "Heparin", dose: "5000 IU IV", administered_at: "14:10", administered_by: "Medic Alpha", entry_id: "M5" }
      ],
      gps: { lat: 12.889500, lng: 77.564500, altitude: 912.0 },
      triage_color: "RED",
      delta_fields: [],
      offline_cached: false,
      sequence_id: 5,
      hmac_signature: "8823f99aa127c5419bb62de190a4216e53a28c4bb19ecad75218d6bc129845ef",
      verification_status: "VERIFIED"
    },
    metrics: { severity: 9.2, time_sensitivity: 2.4, time_to_help: 0.6, priority_score: 52.0 },
    priority_score: 52.0,
    triage_badge: "RED"
  },
  {
    capsule: {
      patient_id: "PT-204",
      patient_name: "Cpl. David Chen",
      age: 38,
      gender: "M",
      timestamp: Date.now() / 1000 - 450,
      time_to_help: 32.0, // Prolonged Field Care
      vitals: {
        heart_rate: 104.0,
        spo2: 93.0,
        systolic_bp: 108.0,
        diastolic_bp: 72.0,
        respiratory_rate: 22.0,
        temperature: 38.3,
        bed_force: 1650.0,
        fall_detected: false
      },
      red_flags: ["blast_injury_burns_2nd_degree", "austere_outpost_isolated"],
      eye_gaze: {
        command: "WATER",
        direction: "LEFT",
        blink_count: 1,
        timestamp: Date.now() / 1000 - 300
      },
      medications: [
        { medication: "Ceftriaxone", dose: "1g IV", administered_at: "12:00", administered_by: "Sgt. Bradley", entry_id: "M6" }
      ],
      gps: { lat: 12.875210, lng: 77.579430, altitude: 925.0 },
      triage_color: "YELLOW",
      delta_fields: [],
      offline_cached: false,
      sequence_id: 4,
      hmac_signature: "c35d7b9a4f11c8cd2f4cf40860b602ac04d3aef0d15b88a24e3cadc3a85c31d6",
      verification_status: "VERIFIED"
    },
    metrics: { severity: 5.0, time_sensitivity: 1.8, time_to_help: 32.0, priority_score: 24.8 },
    priority_score: 24.8,
    triage_badge: "YELLOW"
  },
  {
    capsule: {
      patient_id: "PT-309",
      patient_name: "Lt. Elena Rostova",
      age: 42,
      gender: "F",
      timestamp: Date.now() / 1000 - 100,
      time_to_help: 2.5,
      vitals: {
        heart_rate: 92.0,
        spo2: 96.0,
        systolic_bp: 122.0,
        diastolic_bp: 78.0,
        respiratory_rate: 18.0,
        temperature: 37.1,
        bed_force: 2180.0,
        fall_detected: false
      },
      red_flags: ["spinal_cord_immobilized", "dysphagia", "c5_quadriparesis"],
      eye_gaze: {
        command: "CALL_NURSE",
        direction: "CENTER",
        blink_count: 2,
        timestamp: Date.now() / 1000 - 45
      },
      medications: [
        { medication: "Methylprednisolone", dose: "500mg IV", administered_at: "13:30", administered_by: "Dr. Kulkarni", entry_id: "M7" }
      ],
      gps: { lat: 12.868920, lng: 77.574210, altitude: 915.0 },
      triage_color: "YELLOW",
      delta_fields: [],
      offline_cached: false,
      sequence_id: 3,
      hmac_signature: "c903eafef34831856251512c30ad03c666aae4a6143a0ccccf58a103f0879a67",
      verification_status: "VERIFIED"
    },
    metrics: { severity: 5.2, time_sensitivity: 1.8, time_to_help: 2.5, priority_score: 18.4 },
    priority_score: 18.4,
    triage_badge: "YELLOW"
  },
  {
    capsule: {
      patient_id: "PT-215",
      patient_name: "Paramedic Rajesh Rao",
      age: 45,
      gender: "M",
      timestamp: Date.now() / 1000 - 210,
      time_to_help: 1.8,
      vitals: {
        heart_rate: 112.0,
        spo2: 92.0,
        systolic_bp: 138.0,
        diastolic_bp: 88.0,
        respiratory_rate: 24.0,
        temperature: 37.6,
        bed_force: 1880.0,
        fall_detected: false
      },
      red_flags: ["acute_smoke_inhalation", "stridor_risk", "chemical_edema"],
      eye_gaze: null,
      medications: [
        { medication: "Albuterol Nebulizer", dose: "5mg", administered_at: "14:00", administered_by: "Medic Bravo", entry_id: "M8" },
        { medication: "Dexamethasone", dose: "8mg IV", administered_at: "14:15", administered_by: "Dr. Sharma", entry_id: "M9" }
      ],
      gps: { lat: 12.873200, lng: 77.581200, altitude: 917.0 },
      triage_color: "YELLOW",
      delta_fields: [],
      offline_cached: false,
      sequence_id: 7,
      hmac_signature: "fa829104b901ce45a7d6e5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4",
      verification_status: "VERIFIED"
    },
    metrics: { severity: 4.8, time_sensitivity: 1.9, time_to_help: 1.8, priority_score: 16.2 },
    priority_score: 16.2,
    triage_badge: "YELLOW"
  },
  {
    capsule: {
      patient_id: "PT-412",
      patient_name: "Operative Vikram Singh",
      age: 31,
      gender: "M",
      timestamp: Date.now() / 1000 - 150,
      time_to_help: 1.2,
      vitals: {
        heart_rate: 78.0,
        spo2: 98.0,
        systolic_bp: 118.0,
        diastolic_bp: 78.0,
        respiratory_rate: 16.0,
        temperature: 36.9,
        bed_force: 1550.0,
        fall_detected: false
      },
      red_flags: ["extremity_lacerations", "hmac_tamper_quarantined"],
      eye_gaze: {
        command: "BATHROOM",
        direction: "RIGHT",
        blink_count: 1,
        timestamp: Date.now() / 1000 - 70
      },
      medications: [
        { medication: "Paracetamol", dose: "1g PO", administered_at: "13:45", administered_by: "Field Nurse", entry_id: "M10" }
      ],
      gps: { lat: 12.873540, lng: 77.572180, altitude: 918.0 },
      triage_color: "GREEN",
      delta_fields: [],
      offline_cached: false,
      sequence_id: 2,
      hmac_signature: "bad_tampered_hash_9876543210deadbeef",
      verification_status: "TAMPERED"
    },
    metrics: { severity: 1.5, time_sensitivity: 1.2, time_to_help: 1.2, priority_score: 4.2 },
    priority_score: 4.2,
    triage_badge: "GREEN"
  },
  {
    capsule: {
      patient_id: "PT-508",
      patient_name: "Capt. Priya Nair",
      age: 36,
      gender: "F",
      timestamp: Date.now() / 1000 - 320,
      time_to_help: 3.5,
      vitals: {
        heart_rate: 72.0,
        spo2: 99.0,
        systolic_bp: 116.0,
        diastolic_bp: 74.0,
        respiratory_rate: 15.0,
        temperature: 36.8,
        bed_force: 1620.0,
        fall_detected: false
      },
      red_flags: ["soft_tissue_contusion", "clavicle_non_displaced"],
      eye_gaze: null,
      medications: [
        { medication: "Ibuprofen", dose: "400mg PO", administered_at: "13:15", administered_by: "Medic Echo", entry_id: "M11" }
      ],
      gps: { lat: 12.872100, lng: 77.575500, altitude: 921.0 },
      triage_color: "GREEN",
      delta_fields: [],
      offline_cached: false,
      sequence_id: 9,
      hmac_signature: "3389a0f4c7815b26d1947a5ec9832104bdca87e654321908fedcba9876543210",
      verification_status: "VERIFIED"
    },
    metrics: { severity: 1.0, time_sensitivity: 1.0, time_to_help: 3.5, priority_score: 2.1 },
    priority_score: 2.1,
    triage_badge: "GREEN"
  }
];

export const DEFAULT_TIMELINE_FIXTURE = [
  {
    id: "INC-101",
    timestamp: "06:12:44",
    patient_id: "PT-101",
    category: "VITALS_CRITICAL",
    title: "Critical Hypoxia Spike (PT-101)",
    details: "SpO2 plummeted to 86.0%. Pulse: 138.0 bpm with tension pneumothorax red flag.",
    conflict_detected: false,
    resolution: null
  },
  {
    id: "INC-102",
    timestamp: "06:11:15",
    patient_id: "PT-101",
    category: "CONFLICT_RESOLVED",
    title: "Duplicate Medication Admin Detected: Fentanyl",
    details: "Duplicate record detected: 'Fentanyl 100mcg' recorded by Paramedic Sierra matches record by Medic Echo at 14:15.",
    conflict_detected: true,
    resolution: "Nirantara Conflict Resolution: Merged duplicate log into single administration dose to prevent double-counting."
  },
  {
    id: "INC-103",
    timestamp: "06:09:50",
    patient_id: "PT-102",
    category: "VITALS_CRITICAL",
    title: "Hypovolemic Shock Alert (PT-102)",
    details: "Systolic BP dropped to 78/48 mmHg; Heart rate spiked to 142 bpm. Internal hemorrhage active.",
    conflict_detected: false,
    resolution: "Massive transfusion protocol initiated with Manipal Blood Bank."
  },
  {
    id: "INC-104",
    timestamp: "06:08:22",
    patient_id: "PT-412",
    category: "SECURITY_ALERT",
    title: "Tampered Capsule Signature Detected for PT-412",
    details: "HMAC-SHA256 signature verification failed over insecure RF field link. Hash altered in transit.",
    conflict_detected: true,
    resolution: "Capsule marked as TAMPERED; quarantined for manual cryptographic review."
  },
  {
    id: "INC-105",
    timestamp: "06:07:05",
    patient_id: "PT-412",
    category: "EYE_GAZE_ALERT",
    title: "Eye-Gaze Command: BATHROOM",
    details: "EOG detected 1 blink, direction RIGHT. Verification: TAMPERED.",
    conflict_detected: true,
    resolution: "Suspended pending re-auth"
  },
  {
    id: "INC-106",
    timestamp: "06:05:40",
    patient_id: "PT-309",
    category: "EYE_GAZE_ALERT",
    title: "Eye-Gaze Command: CALL_NURSE",
    details: "EOG detected 2 blinks, direction CENTER. Verification: VERIFIED.",
    conflict_detected: false,
    resolution: "Action dispatched to Command Hospital Air Force bedside operator."
  },
  {
    id: "INC-107",
    timestamp: "06:04:12",
    patient_id: "PT-102",
    category: "MEDICATION_ADMIN",
    title: "Medication Administered: Tranexamic Acid (1g IV)",
    details: "Administered by Dr. Nair at 14:20 for trauma-induced coagulopathy control.",
    conflict_detected: false,
    resolution: null
  },
  {
    id: "INC-108",
    timestamp: "06:02:30",
    patient_id: "PT-620",
    category: "VITALS_CRITICAL",
    title: "Acute STEMI / Hypertensive Crisis (PT-620)",
    details: "ST-Elevation on 12-lead telemetry; BP 168/104 mmHg, HR 128 bpm.",
    conflict_detected: false,
    resolution: "Cardiac cath lab prep alerted at Manipal Command Center Bed #03."
  },
  {
    id: "INC-109",
    timestamp: "05:59:18",
    patient_id: "PT-204",
    category: "CONFLICT_RESOLVED",
    title: "Overlapping Antibiotic Dosing Resolved: Ceftriaxone",
    details: "Ceftriaxone 1g IV recorded concurrently across disconnected field nodes during RF blackout.",
    conflict_detected: true,
    resolution: "Single valid dose reconciled via sequence timestamp deterministic merge."
  },
  {
    id: "INC-110",
    timestamp: "05:58:04",
    patient_id: "PT-204",
    category: "EYE_GAZE_ALERT",
    title: "Eye-Gaze Command: WATER",
    details: "EOG detected 1 blink, direction LEFT. Verification: VERIFIED.",
    conflict_detected: false,
    resolution: "Action dispatched to bedside operator."
  },
  {
    id: "INC-111",
    timestamp: "05:55:42",
    patient_id: "PT-215",
    category: "MEDICATION_ADMIN",
    title: "Medication Administered: Albuterol Nebulizer (5mg)",
    details: "Administered by Medic Bravo at 14:00 for smoke inhalation bronchospasm.",
    conflict_detected: false,
    resolution: null
  },
  {
    id: "INC-112",
    timestamp: "05:52:10",
    patient_id: "PT-101",
    category: "EYE_GAZE_ALERT",
    title: "Eye-Gaze Command: PAIN",
    details: "EOG detected 3 blinks, direction CENTER. Verification: VERIFIED.",
    conflict_detected: false,
    resolution: "Action dispatched to bedside operator."
  },
  {
    id: "INC-113",
    timestamp: "05:50:00",
    patient_id: "SYSTEM",
    category: "SYNC_DEDUPLICATION",
    title: "Offline Batch Replay Reconciled (18 Packets)",
    details: "Autonomous delta synchronization merged 18 offline sensor records with zero database collisions.",
    conflict_detected: false,
    resolution: "100% cryptographic checksum verification completed."
  },
  {
    id: "INC-114",
    timestamp: "05:46:25",
    patient_id: "SYSTEM",
    category: "SECURITY_ALERT",
    title: "Dual-Path RF Network Failover Engaged",
    details: "Port A Primary RTT spiked to 48.2ms; seamless sub-500ms failover transitioned to Port B Backup.",
    conflict_detected: false,
    resolution: "TinyML Auto-reroute stabilized telemetry stream."
  }
];
