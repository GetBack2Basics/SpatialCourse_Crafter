// Real WebSocket Client Broadcaster & Local Listener Gateway

class RealWebSocketService {
  constructor() {
    this.listeners = new Set();
    this.logs = [
      { id: '1', timestamp: new Date().toLocaleTimeString(), type: 'SYSTEM', message: 'WebSocket Service Initialized.' }
    ];

    this.socket = null;
    this.connectRealWebSocket();
  }

  connectRealWebSocket() {
    try {
      const wsUrl = `ws://${window.location.hostname}:8080/ws`;
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.emitLog('SYSTEM', 'Real WebSocket Connection Established with Node.js Server.');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.addLog(data);
        } catch (e) {
          console.warn("Failed to parse WS message:", e);
        }
      };

      this.socket.onerror = () => {
        console.log("WebSocket connection error. Operating in client-side event mode.");
      };
    } catch (err) {
      console.log("WebSocket connection failed. Using local event mode:", err.message);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.logs);
    return () => this.listeners.delete(callback);
  }

  addLog(logItem) {
    this.logs.unshift(logItem);
    if (this.logs.length > 60) this.logs.pop();
    this.listeners.forEach(cb => cb([...this.logs]));
  }

  emitLog(type, message, details = null) {
    const logItem = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      details
    };
    this.addLog(logItem);

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(logItem));
    }
  }

  clear() {
    this.logs = [];
    this.listeners.forEach(cb => cb([]));
  }
}

export const wsService = new RealWebSocketService();
export const emitLog = (type, msg, details) => wsService.emitLog(type, msg, details);
