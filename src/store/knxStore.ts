import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";

export type LogEntry = {
  time: string;
  src?: string;
  dir: "IN" | "OUT";
  action: string;
  data?: string;
  decoded?: any;
  error?: string;
};

// State
export const [wsConnected, setWsConnected] = createSignal(false);
export const [knxStatus, setKnxStatus] = createSignal<{ connected: boolean; type: string; options: any }>({ connected: false, type: "none", options: {} });
export const [wsUrl, setWsUrl] = createSignal("ws://localhost:8080");

export const [logs, setLogs] = createStore<LogEntry[]>([]);
export const [subscriptions, setSubscriptions] = createSignal<string[]>([]);
export const [dpts, setDpts] = createStore<Record<string, string>>({});
export const [queryResults, setQueryResults] = createSignal<any[]>([]);
export const [discoveredDevices, setDiscoveredDevices] = createSignal<any[]>([]);

let ws: WebSocket | null = null;

export const connectWS = (url: string) => {
  if (ws) {
    ws.close();
  }
  setWsUrl(url);
  try {
    ws = new WebSocket(url);
    
    ws.onopen = () => {
      setWsConnected(true);
      addLog({ dir: "IN", action: "WS_OPEN", time: new Date().toLocaleTimeString() });
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleWSMessage(payload);
      } catch (e) {
        console.error("Failed to parse WS message", event.data);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      setKnxStatus({ connected: false, type: "none", options: {} });
      addLog({ dir: "IN", action: "WS_CLOSE", time: new Date().toLocaleTimeString() });
      ws = null;
    };

    ws.onerror = (_err) => {
      addLog({ dir: "IN", action: "WS_ERROR", time: new Date().toLocaleTimeString(), error: "WebSocket error occurred" });
    };
  } catch (err: any) {
    addLog({ dir: "IN", action: "WS_ERROR", time: new Date().toLocaleTimeString(), error: err.message });
  }
};

export const disconnectWS = () => {
  if (ws) {
    ws.close();
  }
};

export const sendWSMessage = (payload: any) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
    addLog({
      dir: "OUT",
      action: payload.action,
      data: payload.groupAddress ? `GA: ${payload.groupAddress}` : JSON.stringify(payload),
      time: new Date().toLocaleTimeString()
    });
  } else {
    addLog({
      dir: "OUT",
      action: payload.action,
      time: new Date().toLocaleTimeString(),
      error: "WebSocket not connected"
    });
  }
};

const handleWSMessage = (payload: any) => {
  const time = new Date().toLocaleTimeString();
  switch (payload.action) {
    case "connected":
      addLog({ dir: "IN", action: "connected", data: payload.message, time });
      break;
    case "knx_connection_status":
      setKnxStatus({
        connected: payload.connected,
        type: payload.type,
        options: payload.options || {}
      });
      addLog({ dir: "IN", action: "knx_status", data: `Connected: ${payload.connected}, Type: ${payload.type}`, time });
      break;
    case "event":
      addLog({
        dir: "IN",
        action: "event",
        src: payload.sourceLinkKey || "BUS",
        data: `GA: ${payload.groupAddress} | CEMI: ${payload.cemi}`,
        decoded: payload.decodedValue,
        time
      });
      break;
    case "config_dpt_ack":
      setDpts(payload.groupAddress, payload.dpt);
      addLog({ dir: "IN", action: "config_dpt_ack", data: `GA: ${payload.groupAddress} -> DPT ${payload.dpt}`, time });
      break;
    case "subscribe_ack":
      if (!subscriptions().includes(payload.groupAddress)) {
        setSubscriptions([...subscriptions(), payload.groupAddress]);
      }
      addLog({ dir: "IN", action: "subscribe_ack", data: `Subscribed to: ${payload.groupAddress}`, time });
      break;
    case "unsubscribe_ack":
      setSubscriptions(subscriptions().filter(s => s !== payload.groupAddress));
      addLog({ dir: "IN", action: "unsubscribe_ack", data: `Unsubscribed from: ${payload.groupAddress}`, time });
      break;
    case "query_result":
      setQueryResults(payload.results || []);
      addLog({ dir: "IN", action: "query_result", data: `Results for ${payload.groupAddress}: ${payload.results?.length || 0}`, time });
      break;
    case "discover_result":
      setDiscoveredDevices(payload.devices || []);
      addLog({ dir: "IN", action: "discover_result", data: `Discovered devices: ${payload.devices?.length || 0}`, time });
      break;
    case "error":
      addLog({ dir: "IN", action: "error", error: payload.message, time });
      break;
    default:
      addLog({ dir: "IN", action: payload.action, data: JSON.stringify(payload), time });
      break;
  }
};

export const addLog = (log: LogEntry) => {
  setLogs((prev) => [...prev, log].slice(-100)); // Keep last 100 logs
};

// Global KNX Helpers
export const connectKnx = (type: string, options: any) => {
  sendWSMessage({ action: "connect_knx", connectionType: type, connectionOptions: options });
};

export const disconnectKnx = () => {
  sendWSMessage({ action: "disconnect_knx" });
};

export const configDpt = (ga: string, dpt: string) => {
  sendWSMessage({ action: "config_dpt", groupAddress: ga, dpt });
};

export const writeKnx = (ga: string, value: any, dpt?: string) => {
  sendWSMessage({ action: "write", groupAddress: ga, value, dpt });
};

export const readKnx = (ga: string) => {
  sendWSMessage({ action: "read", groupAddress: ga });
};

export const subscribeKnx = (ga: string) => {
  sendWSMessage({ action: "subscribe", groupAddress: ga });
};

export const unsubscribeKnx = (ga: string) => {
  sendWSMessage({ action: "unsubscribe", groupAddress: ga });
};

export const queryKnx = (ga: string) => {
  sendWSMessage({ action: "query", groupAddress: ga });
};

export const discoverKnx = (ipLocal?: string) => {
  const payload: any = { action: "discover" };
  if (ipLocal) payload.ipLocal = ipLocal;
  sendWSMessage(payload);
};
