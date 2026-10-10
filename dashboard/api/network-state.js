export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    "active_port": "PORT_A",
    "port_a": {
      "port_id": "PORT_A",
      "status": "UP",
      "role": "PRIMARY",
      "rtt_ms": 24.2,
      "packet_loss_pct": 0.0,
      "jitter_ms": 1.4,
      "bytes_tx": 128400,
      "bytes_rx": 98200
    },
    "port_b": {
      "port_id": "PORT_B",
      "status": "HOT_STANDBY",
      "role": "BACKUP",
      "rtt_ms": 41.8,
      "packet_loss_pct": 0.0,
      "jitter_ms": 2.1,
      "bytes_tx": 24000,
      "bytes_rx": 18500
    },
    "auto_failover_enabled": true,
    "last_failover_time": "05:46:25",
    "tinyml_anomaly_score": 0.08,
    "tinyml_inference_latency_ms": 0.007
  });
}
