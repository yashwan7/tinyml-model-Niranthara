import { useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';

const DEFAULT_BROKER_URL = 'wss://broker.hivemq.com:8084/mqtt';
const DEFAULT_TOPIC = 'izanagi/sensors/data';

/**
 * useMqttTelemetry
 * Consumes real-time patient telemetry with a built-in 5-second local mock data loop.
 * 
 * Data Generation Requirements:
 * 1. Pulse Rate (pulse_val / pulse_bpm):
 *    - Fluctuates smoothly between 65 BPM and 95 BPM.
 *    - Adds slight random variation (±2 to 4 BPM) on each tick to mimic live sinus rhythm.
 *    - Update interval: Every 5 seconds (5000ms).
 * 2. Bed Force Sensor (force_n):
 *    - Fluctuates between 1200 N and 2400 N (simulating normal patient movement/shifting weight).
 *    - Randomizes naturally on every tick.
 *    - Update interval: Every 5 seconds (5000ms).
 * 3. UI Display:
 *    - Updates state variables feeding Pulse Rate Card, Bed Force Card, and connected waveform charts.
 *    - Telemetry status badge: "SIMULATED LOCAL STREAM" (or Green "CONNECTED (MOCK)").
 *    - Increments packet counter (Pkts) by 1 on every 5-second tick.
 */
export function useMqttTelemetry(options = {}) {
  const brokerUrl = options.brokerUrl || DEFAULT_BROKER_URL;
  const topic = options.topic || DEFAULT_TOPIC;
  const enableMock = options.enableMock !== undefined ? options.enableMock : true;

  // Initial Telemetry State within realistic clinical ranges
  const [telemetry, setTelemetry] = useState({
    pulse_val: 76,
    pulse_bpm: 76,
    force_n: 1820,
    hub_online: true,
    lat: '12.871773',
    lng: '77.576856'
  });

  // Telemetry status badge state
  const [connectionStatus, setConnectionStatus] = useState(
    enableMock ? 'SIMULATED LOCAL STREAM' : 'CONNECTING'
  );
  const [packetCount, setPacketCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
  const [history, setHistory] = useState([74, 76, 75, 78, 77, 75, 78, 80, 77, 76]);

  // Dual-Port Network Latency Jitter State (fluctuates every 500ms)
  const [networkLatency, setNetworkLatency] = useState({
    portA_rtt: 24.5,
    portB_rtt: 42.1,
    portA_jitter: 1.8,
    portB_jitter: 2.4,
    portAHistory: [22.4, 24.8, 26.1, 24.0, 22.8, 25.4, 27.2, 23.9, 24.5, 25.1],
    portBHistory: [41.5, 43.2, 45.0, 39.8, 42.1, 44.7, 46.2, 41.0, 42.8, 43.5]
  });

  const clientRef = useRef(null);
  const pendingUpdateRef = useRef(null);

  // Persistent references for smooth, natural patient physiological drift
  const currentPulseRef = useRef(76);
  const currentForceRef = useRef(1820);

  /**
   * Generates a realistic mock telemetry tick every 5 seconds (5000ms)
   */
  const generateMockTick = useCallback(() => {
    // 1. Pulse Rate: fluctuate between 65 BPM and 95 BPM with ±2 to 4 BPM sinus variation
    const sign = Math.random() < 0.5 ? -1 : 1;
    const pulseDelta = sign * (2 + Math.random() * 2); // ±2 to 4 BPM
    let nextPulse = Math.round(currentPulseRef.current + pulseDelta);

    // Natural bounce back if approaching bounds [65, 95] BPM
    if (nextPulse < 65) {
      nextPulse = 65 + Math.floor(Math.random() * 3);
    } else if (nextPulse > 95) {
      nextPulse = 95 - Math.floor(Math.random() * 3);
    }
    currentPulseRef.current = nextPulse;

    // 2. Bed Force Sensor: fluctuate between 1200 N and 2400 N (simulating patient shifting weight)
    const forceSign = Math.random() < 0.5 ? -1 : 1;
    // Blend subtle micro-motion (30-70N) with occasional posture shift (80-160N)
    const isShift = Math.random() < 0.35;
    const forceDelta = forceSign * (isShift ? (80 + Math.random() * 80) : (25 + Math.random() * 45));
    let nextForce = Math.round(currentForceRef.current + forceDelta);

    // Keep naturally bounded within [1200, 2400] N
    if (nextForce < 1200) {
      nextForce = 1200 + Math.floor(Math.random() * 80);
    } else if (nextForce > 2400) {
      nextForce = 2400 - Math.floor(Math.random() * 80);
    }
    currentForceRef.current = nextForce;

    const newTelemetry = {
      pulse_val: nextPulse,
      pulse_bpm: nextPulse,
      force_n: nextForce,
      hub_online: true,
      lat: '12.871773',
      lng: '77.576856'
    };

    // Update state variables smoothly
    setTelemetry(newTelemetry);
    setPacketCount(prev => prev + 1);
    setLastUpdated(new Date().toLocaleTimeString());
    setHistory(prev => [...prev.slice(-19), nextPulse]);

    // Optional: publish simulated packet to broker if connected
    if (clientRef.current && clientRef.current.connected) {
      try {
        clientRef.current.publish(topic, JSON.stringify(newTelemetry), { qos: 0 });
      } catch (_) {}
    }
  }, [topic]);

  /**
   * Process external incoming packet (from real MQTT hardware or manual injection)
   */
  const processPacket = useCallback((payload) => {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

      const rawPulse = data.pulse_val ?? data.pulse_bpm ?? data.pulse ?? data.hr;
      const rawForce = data.force_n ?? data.force ?? data.bed_force ?? data.weight;
      const rawHub = data.hub_online ?? data.hubOnline ?? data.online;
      const rawLat = data.lat ?? data.latitude ?? '12.871773';
      const rawLng = data.lng ?? data.longitude ?? '77.576856';

      const validPulse = typeof rawPulse === 'number' ? rawPulse : Number(rawPulse) || 76;
      const validForce = typeof rawForce === 'number' ? rawForce : Number(rawForce) || 1820;

      currentPulseRef.current = validPulse;
      currentForceRef.current = validForce;

      const newTelemetry = {
        pulse_val: validPulse,
        pulse_bpm: validPulse,
        force_n: validForce,
        hub_online: rawHub !== undefined ? (typeof rawHub === 'boolean' ? rawHub : String(rawHub).toLowerCase() === 'true') : true,
        lat: String(rawLat),
        lng: String(rawLng)
      };

      if (pendingUpdateRef.current) {
        cancelAnimationFrame(pendingUpdateRef.current);
      }

      pendingUpdateRef.current = requestAnimationFrame(() => {
        setTelemetry(newTelemetry);
        setPacketCount(prev => prev + 1);
        setLastUpdated(new Date().toLocaleTimeString());
        setHistory(prev => [...prev.slice(-19), newTelemetry.pulse_val]);
      });
    } catch (err) {
      console.warn('[MQTT] Failed to parse payload:', err);
    }
  }, []);

  /**
   * 5-Second Local Mock Simulation Loop (Runs continuously every 5000ms)
   */
  useEffect(() => {
    if (!enableMock) return;

    // Run baseline initial packet immediately
    generateMockTick();

    // 5-second interval loop (5000ms)
    const intervalTimer = setInterval(() => {
      generateMockTick();
    }, 5000);

    return () => clearInterval(intervalTimer);
  }, [enableMock, generateMockTick]);

  /**
   * Continuous 500ms Network Latency Jitter Loop (Port A & Port B)
   * Requirements:
   * - Port A: 20.0 ms to 35.0 ms, rounded to 1 decimal place.
   * - Port B: 35.0 ms to 50.0 ms, rounded to 1 decimal place.
   * - Jitter: kept between 1.0 ms and 3.5 ms.
   * - Update timing: every 500ms.
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
   * HiveMQ MQTT WebSocket Client (runs in background for live network sync)
   */
  useEffect(() => {
    let isSubscribed = true;

    try {
      const clientId = 'MacBook_Dashboard_' + Math.random().toString(16).substring(2, 8);
      const client = mqtt.connect(brokerUrl, {
        clientId,
        keepalive: 60,
        reconnectPeriod: 2000,
        clean: true,
      });

      clientRef.current = client;

      client.on('connect', () => {
        if (!isSubscribed) return;
        setConnectionStatus(enableMock ? 'CONNECTED (MOCK)' : 'CONNECTED');
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
          const text = messageBuffer.toString();
          processPacket(text);
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

  /**
   * Manual sample injection helper
   */
  const injectSamplePacket = useCallback((override = {}) => {
    generateMockTick();
  }, [generateMockTick]);

  return {
    telemetry,
    connectionStatus,
    packetCount,
    lastUpdated,
    pulseHistory: history,
    portA_rtt: networkLatency.portA_rtt,
    portB_rtt: networkLatency.portB_rtt,
    portA_jitter: networkLatency.portA_jitter,
    portB_jitter: networkLatency.portB_jitter,
    networkLatency,
    brokerUrl,
    topic,
    injectSamplePacket,
    generateMockTick
  };
}
