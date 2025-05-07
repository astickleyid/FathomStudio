import { useState, useEffect, useCallback } from 'react';

// WebSocket ready states
const WS_READY_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

export type WebSocketMessage = {
  type: string;
  message?: string;
  data?: any;
};

// Create a singleton WebSocket instance
class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: WebSocket | null = null;
  private reconnectTimeout: number | null = null;
  private pingInterval: number | null = null;
  private listeners: Set<(message: WebSocketMessage) => void> = new Set();
  private statusListeners: Set<(connected: boolean) => void> = new Set();
  
  private constructor() {
    // Initialize the connection
    this.connect();
  }
  
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }
  
  // Connect to the WebSocket server
  private connect(): void {
    // Close existing connection if any
    if (this.socket) {
      this.socket.close();
    }
    
    // Determine the correct WebSocket URL based on the current protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    // Create new WebSocket connection
    this.socket = new WebSocket(wsUrl);
    
    // Connection opened
    this.socket.addEventListener('open', () => {
      console.log('WebSocket connection established');
      this.notifyStatusChange(true);
      
      // Clear any reconnect timeout
      if (this.reconnectTimeout !== null) {
        window.clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      // Setup periodic ping to keep connection alive
      this.setupPing();
    });
    
    // Listen for messages
    this.socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        // Notify all listeners of the message
        this.notifyMessage(data);
        
        // Handle specific message types
        if (data.type === 'connected') {
          console.log('Connection acknowledged by server:', data.message);
        } else if (data.type === 'pong') {
          console.log('Received pong from server');
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    // Connection closed
    this.socket.addEventListener('close', () => {
      console.log('WebSocket connection closed');
      this.notifyStatusChange(false);
      
      // Clear the ping interval
      if (this.pingInterval !== null) {
        window.clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      
      // Attempt to reconnect after a delay
      this.reconnectTimeout = window.setTimeout(() => {
        this.connect();
      }, 3000);
    });
    
    // Connection error
    this.socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }
  
  // Setup periodic ping to keep connection alive
  private setupPing(): void {
    // Clear any existing ping interval
    if (this.pingInterval !== null) {
      window.clearInterval(this.pingInterval);
    }
    
    // Setup a new ping interval
    this.pingInterval = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WS_READY_STATES.OPEN) {
        console.log('Ping sent');
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000);
  }
  
  // Send a message to the WebSocket server
  public sendMessage(message: WebSocketMessage): boolean {
    if (this.socket && this.socket.readyState === WS_READY_STATES.OPEN) {
      this.socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }
  
  // Add a message listener
  public addMessageListener(listener: (message: WebSocketMessage) => void): void {
    this.listeners.add(listener);
  }
  
  // Remove a message listener
  public removeMessageListener(listener: (message: WebSocketMessage) => void): void {
    this.listeners.delete(listener);
  }
  
  // Add a status change listener
  public addStatusListener(listener: (connected: boolean) => void): void {
    this.statusListeners.add(listener);
    // Immediately notify the listener of the current connection status
    if (this.socket) {
      listener(this.socket.readyState === WS_READY_STATES.OPEN);
    } else {
      listener(false);
    }
  }
  
  // Remove a status change listener
  public removeStatusListener(listener: (connected: boolean) => void): void {
    this.statusListeners.delete(listener);
  }
  
  // Notify all message listeners of a new message
  private notifyMessage(message: WebSocketMessage): void {
    this.listeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in WebSocket message listener:', error);
      }
    });
  }
  
  // Notify all status listeners of a connection status change
  private notifyStatusChange(connected: boolean): void {
    this.statusListeners.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        console.error('Error in WebSocket status listener:', error);
      }
    });
  }
  
  // Check if the WebSocket is connected
  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WS_READY_STATES.OPEN;
  }
}

// React hook for using the WebSocket
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const webSocketManager = WebSocketManager.getInstance();
  
  // Handle WebSocket messages
  useEffect(() => {
    const handleMessage = (message: WebSocketMessage) => {
      setLastMessage(message);
    };
    
    const handleStatus = (connected: boolean) => {
      setIsConnected(connected);
    };
    
    // Add listeners
    webSocketManager.addMessageListener(handleMessage);
    webSocketManager.addStatusListener(handleStatus);
    
    // Remove listeners on cleanup
    return () => {
      webSocketManager.removeMessageListener(handleMessage);
      webSocketManager.removeStatusListener(handleStatus);
    };
  }, []);
  
  // Send message to WebSocket server
  const sendMessage = useCallback((message: WebSocketMessage) => {
    return webSocketManager.sendMessage(message);
  }, [webSocketManager]);
  
  // Send a track action notification
  const sendTrackAction = useCallback((actionType: string, trackId: number, trackName: string) => {
    return sendMessage({
      type: 'track_action',
      data: {
        actionType,
        trackId,
        trackName,
        timestamp: new Date().toISOString()
      }
    });
  }, [sendMessage]);
  
  return {
    isConnected,
    lastMessage,
    sendMessage,
    sendTrackAction
  };
}