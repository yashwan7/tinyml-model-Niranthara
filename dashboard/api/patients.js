export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json([
    {
      "capsule": {
        "patient_id": "PT-101",
        "patient_name": "Sgt. Marcus Vance",
        "age": 34,
        "gender": "M",
        "timestamp": Date.now() / 1000 - 120,
        "time_to_help": 0.4,
        "vitals": {
          "heart_rate": 138.0,
          "spo2": 86.0,
          "systolic_bp": 88.0,
          "diastolic_bp": 56.0,
          "respiratory_rate": 34.0,
          "temperature": 36.4,
          "bed_force": 1950.0,
          "fall_detected": true
        },
        "red_flags": ["tension_pneumothorax", "penetrating_chest_trauma", "severe_hypoxemia"],
        "eye_gaze": { "command": "PAIN", "direction": "CENTER", "blink_count": 3 },
        "medications": [{ "medication": "Fentanyl", "dose": "100mcg", "administered_at": "14:15", "administered_by": "Medic Echo", "entry_id": "M1" }],
        "gps": { "lat": 12.871773, "lng": 77.576856, "altitude": 920.0 },
        "triage_color": "RED",
        "delta_fields": [],
        "offline_cached": true,
        "sequence_id": 12,
        "verification_status": "VERIFIED"
      },
      "metrics": { "severity": 10.0, "time_sensitivity": 2.5, "time_to_help": 0.4, "priority_score": 62.5 },
      "priority_score": 62.5,
      "triage_badge": "RED"
    },
    {
      "capsule": {
        "patient_id": "PT-102",
        "patient_name": "Dr. Ananya Sengupta",
        "age": 29,
        "gender": "F",
        "timestamp": Date.now() / 1000 - 180,
        "time_to_help": 0.5,
        "vitals": {
          "heart_rate": 142.0,
          "spo2": 84.0,
          "systolic_bp": 78.0,
          "diastolic_bp": 48.0,
          "respiratory_rate": 36.0,
          "temperature": 35.8,
          "bed_force": 1420.0,
          "fall_detected": true
        },
        "red_flags": ["massive_pelvic_fracture", "hypovolemic_shock", "internal_hemorrhage"],
        "eye_gaze": { "command": "HELP", "direction": "UP", "blink_count": 2 },
        "medications": [{ "medication": "Tranexamic Acid", "dose": "1g IV", "administered_at": "14:20", "administered_by": "Dr. Nair", "entry_id": "M2" }],
        "gps": { "lat": 12.874500, "lng": 77.576800, "altitude": 918.0 },
        "triage_color": "RED",
        "delta_fields": [],
        "offline_cached": false,
        "sequence_id": 8,
        "verification_status": "VERIFIED"
      },
      "metrics": { "severity": 9.6, "time_sensitivity": 2.8, "time_to_help": 0.5, "priority_score": 58.2 },
      "priority_score": 58.2,
      "triage_badge": "RED"
    },
    {
      "capsule": {
        "patient_id": "PT-620",
        "patient_name": "Sub-Inspector Arun Kumar",
        "age": 49,
        "gender": "M",
        "timestamp": Date.now() / 1000 - 240,
        "time_to_help": 0.6,
        "vitals": {
          "heart_rate": 128.0,
          "spo2": 89.0,
          "systolic_bp": 168.0,
          "diastolic_bp": 104.0,
          "respiratory_rate": 28.0,
          "temperature": 37.2,
          "bed_force": 2250.0,
          "fall_detected": false
        },
        "red_flags": ["acute_stemi_infarction", "cardiogenic_pre_shock", "chest_pressure_severe"],
        "eye_gaze": null,
        "medications": [{ "medication": "Aspirin", "dose": "325mg PO", "administered_at": "14:05", "administered_by": "Medic Alpha", "entry_id": "M4" }],
        "gps": { "lat": 12.889500, "lng": 77.564500, "altitude": 912.0 },
        "triage_color": "RED",
        "delta_fields": [],
        "offline_cached": false,
        "sequence_id": 5,
        "verification_status": "VERIFIED"
      },
      "metrics": { "severity": 9.2, "time_sensitivity": 2.4, "time_to_help": 0.6, "priority_score": 52.0 },
      "priority_score": 52.0,
      "triage_badge": "RED"
    },
    {
      "capsule": {
        "patient_id": "PT-204",
        "patient_name": "Cpl. David Chen",
        "age": 38,
        "gender": "M",
        "timestamp": Date.now() / 1000 - 450,
        "time_to_help": 32.0,
        "vitals": {
          "heart_rate": 104.0,
          "spo2": 93.0,
          "systolic_bp": 108.0,
          "diastolic_bp": 72.0,
          "respiratory_rate": 22.0,
          "temperature": 38.3,
          "bed_force": 1650.0,
          "fall_detected": false
        },
        "red_flags": ["blast_injury_burns_2nd_degree", "austere_outpost_isolated"],
        "eye_gaze": { "command": "WATER", "direction": "LEFT", "blink_count": 1 },
        "medications": [{ "medication": "Ceftriaxone", "dose": "1g IV", "administered_at": "12:00", "administered_by": "Sgt. Bradley", "entry_id": "M6" }],
        "gps": { "lat": 12.875210, "lng": 77.579430, "altitude": 925.0 },
        "triage_color": "YELLOW",
        "delta_fields": [],
        "offline_cached": false,
        "sequence_id": 4,
        "verification_status": "VERIFIED"
      },
      "metrics": { "severity": 5.0, "time_sensitivity": 1.8, "time_to_help": 32.0, "priority_score": 24.8 },
      "priority_score": 24.8,
      "triage_badge": "YELLOW"
    },
    {
      "capsule": {
        "patient_id": "PT-309",
        "patient_name": "Lt. Elena Rostova",
        "age": 42,
        "gender": "F",
        "timestamp": Date.now() / 1000 - 100,
        "time_to_help": 2.5,
        "vitals": {
          "heart_rate": 92.0,
          "spo2": 96.0,
          "systolic_bp": 122.0,
          "diastolic_bp": 78.0,
          "respiratory_rate": 18.0,
          "temperature": 37.1,
          "bed_force": 2180.0,
          "fall_detected": false
        },
        "red_flags": ["spinal_cord_immobilized", "dysphagia", "c5_quadriparesis"],
        "eye_gaze": { "command": "CALL_NURSE", "direction": "CENTER", "blink_count": 2 },
        "medications": [{ "medication": "Methylprednisolone", "dose": "500mg IV", "administered_at": "13:30", "administered_by": "Dr. Kulkarni", "entry_id": "M7" }],
        "gps": { "lat": 12.868920, "lng": 77.574210, "altitude": 915.0 },
        "triage_color": "YELLOW",
        "delta_fields": [],
        "offline_cached": false,
        "sequence_id": 3,
        "verification_status": "VERIFIED"
      },
      "metrics": { "severity": 5.2, "time_sensitivity": 1.8, "time_to_help": 2.5, "priority_score": 18.4 },
      "priority_score": 18.4,
      "triage_badge": "YELLOW"
    },
    {
      "capsule": {
        "patient_id": "PT-215",
        "patient_name": "Paramedic Rajesh Rao",
        "age": 45,
        "gender": "M",
        "timestamp": Date.now() / 1000 - 210,
        "time_to_help": 1.8,
        "vitals": {
          "heart_rate": 112.0,
          "spo2": 92.0,
          "systolic_bp": 138.0,
          "diastolic_bp": 88.0,
          "respiratory_rate": 24.0,
          "temperature": 37.6,
          "bed_force": 1880.0,
          "fall_detected": false
        },
        "red_flags": ["acute_smoke_inhalation", "stridor_risk", "chemical_edema"],
        "eye_gaze": null,
        "medications": [{ "medication": "Albuterol Nebulizer", "dose": "5mg", "administered_at": "14:00", "administered_by": "Medic Bravo", "entry_id": "M8" }],
        "gps": { "lat": 12.873200, "lng": 77.581200, "altitude": 917.0 },
        "triage_color": "YELLOW",
        "delta_fields": [],
        "offline_cached": false,
        "sequence_id": 7,
        "verification_status": "VERIFIED"
      },
      "metrics": { "severity": 4.8, "time_sensitivity": 1.9, "time_to_help": 1.8, "priority_score": 16.2 },
      "priority_score": 16.2,
      "triage_badge": "YELLOW"
    },
    {
      "capsule": {
        "patient_id": "PT-412",
        "patient_name": "Operative Vikram Singh",
        "age": 31,
        "gender": "M",
        "timestamp": Date.now() / 1000 - 150,
        "time_to_help": 1.2,
        "vitals": {
          "heart_rate": 78.0,
          "spo2": 98.0,
          "systolic_bp": 118.0,
          "diastolic_bp": 78.0,
          "respiratory_rate": 16.0,
          "temperature": 36.9,
          "bed_force": 1550.0,
          "fall_detected": false
        },
        "red_flags": ["extremity_lacerations", "hmac_tamper_quarantined"],
        "eye_gaze": { "command": "BATHROOM", "direction": "RIGHT", "blink_count": 1 },
        "medications": [{ "medication": "Paracetamol", "dose": "1g PO", "administered_at": "13:45", "administered_by": "Field Nurse", "entry_id": "M10" }],
        "gps": { "lat": 12.873540, "lng": 77.572180, "altitude": 918.0 },
        "triage_color": "GREEN",
        "delta_fields": [],
        "offline_cached": false,
        "sequence_id": 2,
        "verification_status": "TAMPERED"
      },
      "metrics": { "severity": 1.5, "time_sensitivity": 1.2, "time_to_help": 1.2, "priority_score": 4.2 },
      "priority_score": 4.2,
      "triage_badge": "GREEN"
    },
    {
      "capsule": {
        "patient_id": "PT-508",
        "patient_name": "Capt. Priya Nair",
        "age": 36,
        "gender": "F",
        "timestamp": Date.now() / 1000 - 320,
        "time_to_help": 3.5,
        "vitals": {
          "heart_rate": 72.0,
          "spo2": 99.0,
          "systolic_bp": 116.0,
          "diastolic_bp": 74.0,
          "respiratory_rate": 15.0,
          "temperature": 36.8,
          "bed_force": 1620.0,
          "fall_detected": false
        },
        "red_flags": ["soft_tissue_contusion", "clavicle_non_displaced"],
        "eye_gaze": null,
        "medications": [{ "medication": "Ibuprofen", "dose": "400mg PO", "administered_at": "13:15", "administered_by": "Medic Echo", "entry_id": "M11" }],
        "gps": { "lat": 12.872100, "lng": 77.575500, "altitude": 921.0 },
        "triage_color": "GREEN",
        "delta_fields": [],
        "offline_cached": false,
        "sequence_id": 9,
        "verification_status": "VERIFIED"
      },
      "metrics": { "severity": 1.0, "time_sensitivity": 1.0, "time_to_help": 3.5, "priority_score": 2.1 },
      "priority_score": 2.1,
      "triage_badge": "GREEN"
    }
  ]);
}
