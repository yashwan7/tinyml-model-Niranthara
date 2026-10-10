import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import mqtt from 'mqtt';

const DEFAULT_BROKER_URL = 'wss://broker.hivemq.com:8084/mqtt';
const DEFAULT_TOPIC = 'izanagi/sensors/data';

// Configuration bounds for Pulse Simulation
const PULSE_CONFIG = {
  MIN_BPM: 58,
  MAX_BPM: 108,
  TARGET_BASELINE: 78,
  SWEET_SPOT_MIN: 70,
  SWEET_SPOT_MAX: 89,
  UPDATE_INTERVAL_MS: 1000
};

// Configuration bounds for Bed Force Simulation
const FORCE_CONFIG = {
  MIN_FORCE_N: 1200,
  MAX_FORCE_N: 2400,
  TARGET_BASELINE: 1800,
  UPDATE_INTERVAL_MS: 1000
};

/**
 * Weighted random walk step for human pulse rate (BPM)
 * Favors small changes (1–3 BPM) with occasional larger deviations,
 * centered primarily in the 70–89 BPM range.
 */
function calculateNextPulse(currentBpm) {
  const { MIN_BPM, MAX_BPM, TARGET_BASELINE, SWEET_SPOT_MIN, SWEET_SPOT_MAX } = PULSE_CONFIG;

  // 1. Determine step magnitude (favors 1–3 BPM)
  const randMag = Math.random();
  let stepMagnitude;
  if (randMag < 0.65) {
    // 65% probability: small natural sinus fluctuation (1–2 BPM)
    stepMagnitude = 1 + Math.random() * 1.2;
  } else if (randMag < 0.90) {
    // 25% probability: moderate sinus variation (2–3 BPM)
    stepMagnitude = 2 + Math.random() * 1.2;
  } else {
    // 10% probability: slightly larger excursion (3–4 BPM)
    stepMagnitude = 3 + Math.random() * 1.5;
  }

  // 2. Determine direction (+ or -) with gentle mean-reverting pull toward 70–89 BPM
  let pullProbabilityUp = 0.5;
  if (currentBpm > 98) {
    pullProbabilityUp = 0.12; // strong downward pull back towards normal
  } else if (currentBpm > SWEET_SPOT_MAX) {
    pullProbabilityUp = 0.28; // moderate downward pull
  } else if (currentBpm < 62) {
    pullProbabilityUp = 0.88; // strong upward pull back towards normal
  } else if (currentBpm < SWEET_SPOT_MIN) {
    pullProbabilityUp = 0.72; // moderate upward pull
  } else {
    // Inside sweet spot 70–89: gentle drift toward target baseline ~78 BPM
    if (currentBpm > TARGET_BASELINE + 4) {
      pullProbabilityUp = 0.42;
    } else if (currentBpm < TARGET_BASELINE - 4) {
      pullProbabilityUp = 0.58;
    } else {
      pullProbabilityUp = 0.50;
    }
  }

  const direction = Math.random() < pullProbabilityUp ? 1 : -1;
  const nextRaw = currentBpm + direction * stepMagnitude;

  // 3. Clamp strictly within reasonable simulation range [58, 108]
  const clamped = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(nextRaw)));
  return clamped;
}

/**
 * Realistic fluctuation step for Bed Force load cell (N)
 * Range: 1200 N – 2400 N around a stable patient baseline (~1800 N).
 */
function calculateNextBedForce(currentForce) {
  const { MIN_FORCE_N, MAX_FORCE_N, TARGET_BASELINE } = FORCE_CONFIG;

  const randMag = Math.random();
  let forceDelta;

  if (randMag < 0.75) {
    // 75% probability: subtle respiration / micro-settling (±4 to ±16 N)
    forceDelta = 4 + Math.random() * 12;
  } else if (randMag < 0.95) {
    // 20% probability: small patient movement / limb shift (±18 to ±42 N)
    forceDelta = 18 + Math.random() * 24;
  } else {
    // 5% probability: posture adjustment / weight shift (±45 to ±85 N)
    forceDelta = 45 + Math.random() * 40;
  }

  // Mean-reversion bias towards baseline ~1800 N
  let pullUp = 0.5;
  if (currentForce > 2150) {
    pullUp = 0.18;
  } else if (currentForce > 1950) {
    pullUp = 0.35;
  } else if (currentForce < 1450) {
    pullUp = 0.82;
  } else if (currentForce < 1650) {
    pullUp = 0.65;
  }

  const direction = Math.random() < pullUp ? 1 : -1;
  const nextRaw = currentForce + direction * forceDelta;

  return Math.min(MAX_FORCE_N, Math.max(MIN_FORCE_N, Math.round(nextRaw)));
}

/**
 * useMqttTelemetry
 * Consumes real-time patient telemetry with independent 1-second dynamic
 * simulation loops for Pulse Telemetry and Bed Force.
 */
export function useMqttTelemetry(options = {}) {
  const brokerUrl = options.brokerUrl || DEFAULT_BROKER_URL;
  const topic = options.topic || DEFAULT_TOPIC;
  const enableMock = options.enableMock !== undefined ? options.enableMock : true;

  // 1. Independent State for Pulse Telemetry (initialized with plausible 76 BPM)
  const [pulseVal, setPulseVal] = useState(76);
  const [pulseHistory, setPulseHistory] = useState([74, 75, 76, 75, 77, 76, 78, 77, 76, 76, 75, 77]);

  // 2. Independent State for Bed Force Sensor (initialized with plausible 1820 N)
  const [forceVal, setForceVal] = useState(1820);

  // Common metadata states
  const [hubOnline, setHubOnline] = useState(true);
  const [location] = useState({ lat: '12.871773', lng: '77.576856' });
  const [connectionStatus, setConnectionStatus] = useState(
    enableMock ? 'SIMULATED LOCAL STREAM' : 'CONNECTING'
  );
  const [packetCount, setPacketCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(() => new Date().toLocaleTimeString());

  // Dual-Port Network Latency Jitter State (500ms loop)
  const [networkLatency, setNetworkLatency] = useState({
    portA_rtt: 24.5,
    portB_rtt: 42.1,
    portA_jitter: 1.8,
    portB_jitter: 2.4,
    portAHistory: [22.4, 24.8, 26.1, 24.0, 22.8, 25.4, 27.2, 23.9, 24.5, 25.1],
    portBHistory: [41.5, 43.2, 45.0, 39.8, 42.1, 44.7, 46.2, 41.0, 42.8, 43.5]
  });

  // Tracking references
  const currentPulseRef = useRef(76);
  const currentForceRef = useRef(1820);
  const hasRealHardwareRef = useRef(false);
  const clientRef = useRef(null);
  const pendingUpdateRef = useRef(null);

  /**
   * Dedicated 1-Second Pulse Simulation Tick
   */
  const tickPulseSimulation = useCallback(() => {
    if (hasRealHardwareRef.current) return;

    const nextPulse = calculateNextPulse(currentPulseRef.current);
    currentPulseRef.current = nextPulse;

    setPulseVal(nextPulse);
    setPulseHistory(prev => [...prev.slice(-24), nextPulse]);
    setPacketCount(prev => prev + 1);
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  /**
   * Dedicated 1-Second Bed Force Simulation Tick (Independent of Pulse)
   */
  const tickForceSimulation = useCallback(() => {
    if (hasRealHardwareRef.current) return;

    const nextForce = calculateNextBedForce(currentForceRef.current);
    currentForceRef.current = nextForce;

    setForceVal(nextForce);
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  /**
   * Process incoming real hardware packets from MQTT broker
   */
  const processPacket = useCallback((payload) => {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

      const rawPulse = data.pulse_val ?? data.pulse_bpm ?? data.pulse ?? data.hr;
      const rawForce = data.force_n ?? data.force ?? data.bed_force ?? data.weight;
      const rawHub = data.hub_online ?? data.hubOnline ?? data.online;

      hasRealHardwareRef.current = true;

      if (rawPulse !== undefined && !isNaN(Number(rawPulse))) {
        const pNum = Number(rawPulse);
        currentPulseRef.current = pNum;
        setPulseVal(pNum);
        setPulseHistory(prev => [...prev.slice(-24), pNum]);
      }

      if (rawForce !== undefined && !isNaN(Number(rawForce))) {
        const fNum = Number(rawForce);
        currentForceRef.current = fNum;
        setForceVal(fNum);
      }

      if (rawHub !== undefined) {
        setHubOnline(typeof rawHub === 'boolean' ? rawHub : String(rawHub).toLowerCase() === 'true');
      }

      setPacketCount(prev => prev + 1);
      setLastUpdated(new Date().toLocaleTimeString());
      setConnectionStatus('CONNECTED (HARDWARE)');
    } catch (err) {
      console.warn('[MQTT] Packet parse error:', err);
    }
  }, []);

  /**
   * 1-SECOND PULSE TELEMETRY LOOP
   * Updates once every second (1000ms) with weighted random walk.
   */
  useEffect(() => {
    if (!enableMock) return;

    // Run initial tick
    tickPulseSimulation();

    const pulseInterval = setInterval(() => {
      tickPulseSimulation();
    }, PULSE_CONFIG.UPDATE_INTERVAL_MS);

    return () => clearInterval(pulseInterval);
  }, [enableMock, tickPulseSimulation]);

  /**
   * 1-SECOND BED FORCE LOOP
   * Updates once every second (1000ms) independently of pulse.
   */
  useEffect(() => {
    if (!enableMock) return;

    // Run initial tick
    tickForceSimulation();

    const forceInterval = setInterval(() => {
      tickForceSimulation();
    }, FORCE_CONFIG.UPDATE_INTERVAL_MS);

    return () => clearInterval(forceInterval);
  }, [enableMock, tickForceSimulation]);

  /**
   * 500ms Network Jitter Simulation Loop
   */
  useEffect(() => {
    if (!enableMock) return;

    const jitterTimer = setInterval(() => {
      const nextA = parseFloat((20.0 + Math.random() * 15.0).toFixed(1));
      const nextB = parseFloat((35.0 + Math.random() * 15.0).toFixed(1));
      const jitterA = parseFloat((1.0 + Math.random() * 2.5).toFixed(1));
      const jitterB = parseFloat((1.0 + Math.random() * 2.5).toFixed(1));

      setNetworkLatency(prev => ({
        portA_rtt: nextA,
        portB_rtt: nextB,
        portA_jitter: jitterA,
        portB_jitter: jitterB,
        portAHistory: [...prev.portAHistory.slice(-19), nextA],
        portBHistory: [...prev.portBHistory.slice(-19), nextB]
      }));
    }, 500);

    return () => clearInterval(jitterTimer);
  }, [enableMock]);

  /**
   * MQTT Client connection for optional live telemetry streaming
   */
  useEffect(() => {
    let isSubscribed = true;

    try {
      const clientId = 'MacBook_EMR_' + Math.random().toString(16).substring(2, 8);
      const client = mqtt.connect(brokerUrl, {
        clientId,
        keepalive: 60,
        reconnectPeriod: 3000,
        clean: true,
      });

      clientRef.current = client;

      client.on('connect', () => {
        if (!isSubscribed) return;
        setConnectionStatus(enableMock ? 'SIMULATED LOCAL STREAM' : 'CONNECTED');
        client.subscribe(topic);
      });

      client.on('reconnect', () => {
        if (isSubscribed && !enableMock) setConnectionStatus('RECONNECTING');
      });

      client.on('offline', () => {
        if (isSubscribed) setConnectionStatus(enableMock ? 'SIMULATED LOCAL STREAM' : 'OFFLINE');
      });

      client.on('error', () => {
        if (isSubscribed) setConnectionStatus(enableMock ? 'SIMULATED LOCAL STREAM' : 'RECONNECTING');
      });

      client.on('message', (incomingTopic, messageBuffer) => {
        if (!isSubscribed) return;
        if (incomingTopic === topic) {
          processPacket(messageBuffer.toString());
        }
      });
    } catch (err) {
      console.warn('[MQTT] Client init fallback to mock:', err);
      setConnectionStatus('SIMULATED LOCAL STREAM');
    }

    return () => {
      isSubscribed = false;
      if (pendingUpdateRef.current) {
        cancelAnimationFrame(pendingUpdateRef.current);
      }
      if (clientRef.current) {
        try {
          clientRef.current.end(true);
        } catch (_) {}
      }
    };
  }, [brokerUrl, topic, enableMock, processPacket]);

  // Combined Telemetry Object preserving all existing bindings
  const telemetry = useMemo(() => ({
    pulse_val: pulseVal,
    pulse_bpm: pulseVal,
    force_n: forceVal,
    hub_online: hubOnline,
    lat: location.lat,
    lng: location.lng
  }), [pulseVal, forceVal, hubOnline, location.lat, location.lng]);

  const injectSamplePacket = useCallback((override = {}) => {
    if (override.pulse_val !== undefined) {
      setPulseVal(override.pulse_val);
      currentPulseRef.current = override.pulse_val;
    } else {
      tickPulseSimulation();
    }
    if (override.force_n !== undefined) {
      setForceVal(override.force_n);
      currentForceRef.current = override.force_n;
    } else {
      tickForceSimulation();
    }
    if (override.hub_online !== undefined) {
      setHubOnline(override.hub_online);
    }
  }, [tickPulseSimulation, tickForceSimulation]);

  return {
    telemetry,
    pulseVal,
    forceVal,
    connectionStatus,
    packetCount,
    lastUpdated,
    pulseHistory,
    portA_rtt: networkLatency.portA_rtt,
    portB_rtt: networkLatency.portB_rtt,
    portA_jitter: networkLatency.portA_jitter,
    portB_jitter: networkLatency.portB_jitter,
    networkLatency,
    brokerUrl,
    topic,
    injectSamplePacket,
    generateMockTick: tickPulseSimulation
  };
}
