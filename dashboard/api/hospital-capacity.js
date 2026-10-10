export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    "facility_name": "Bangalore Emergency Command Network (FST-A)",
    "operational_status": "SURGE_ELEVATED",
    "occupancy_pct": 78.5,
    "rationing_mode": false,
    "resupply_drone_eta_mins": 45,
    "bed_units": [
      {
        "unit_id": "ICU-CC",
        "unit_name": "Intensive Care & Resuscitation",
        "category": "ICU",
        "total_beds": 12,
        "occupied_beds": 10,
        "ventilators_total": 10,
        "ventilators_active": 8,
        "critical_reserve": 2
      },
      {
        "unit_id": "TRAUMA-BAY",
        "unit_name": "Acute Trauma Resuscitation Bays",
        "category": "TRAUMA_RESUS",
        "total_beds": 6,
        "occupied_beds": 5,
        "ventilators_total": 6,
        "ventilators_active": 4,
        "critical_reserve": 1
      },
      {
        "unit_id": "STEP-DOWN",
        "unit_name": "Intermediate & Step-Down Ward",
        "category": "STEP_DOWN",
        "total_beds": 24,
        "occupied_beds": 18,
        "ventilators_total": 4,
        "ventilators_active": 2,
        "critical_reserve": 4
      }
    ],
    "critical_resources": [
      {
        "resource_id": "O2-LIQUID",
        "name": "Medical Oxygen (LOX)",
        "category": "OXYGEN",
        "current_level": 860.0,
        "max_capacity": 1200.0,
        "unit": "Liters",
        "burn_rate_per_hour": 48.0,
        "hours_remaining": 17.9,
        "status": "NOMINAL"
      },
      {
        "resource_id": "BLOOD-ONEG",
        "name": "O-Negative Packed RBCs",
        "category": "BLOOD",
        "current_level": 8.0,
        "max_capacity": 20.0,
        "unit": "Units",
        "burn_rate_per_hour": 1.2,
        "hours_remaining": 6.7,
        "status": "WATCHLIST"
      }
    ]
  });
}
