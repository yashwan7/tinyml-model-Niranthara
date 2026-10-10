export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    "regional_status": "NORMAL",
    "total_units_available": 184,
    "critical_shortages": [],
    "hubs": [
      {
        "hub_id": "BB-MANIPAL",
        "name": "Manipal Central Blood Bank",
        "inventory": { "O-NEG": 4, "O-POS": 24, "A-POS": 18, "B-POS": 22, "AB-POS": 8 },
        "distance_km": 3.2,
        "transit_eta_mins": 14
      },
      {
        "hub_id": "BB-STJOHNS",
        "name": "St. John's Blood Transfusion Center",
        "inventory": { "O-NEG": 6, "O-POS": 32, "A-POS": 26, "B-POS": 28, "AB-POS": 12 },
        "distance_km": 5.8,
        "transit_eta_mins": 22
      }
    ]
  });
}
