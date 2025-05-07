import { useState, useEffect, useRef, useCallback } from 'react';

// WebSocket ready states
const WS_READY_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

type WebSocketMessage = {
  type: string;
  message?: string;
  data?: any;
};

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Create connection
  const connect = useCallback(() => {
    // Close any existing connection
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Determine the correct WebSocket URL based on the current protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    // Create new WebSocket connection
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    // Connection opened
    socket.addEventListener('open', () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
      
      // Clear any reconnect timeout
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    // Listen for messages
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        setLastMessage(data);
        
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
    socket.addEventListener('close', () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
      
      // Attempt to reconnect after a delay
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 3000);
    });

    // Connection error
    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Setup periodic ping to keep connection alive
    const pingInterval = window.setInterval(() => {
      if (socket.readyState === WS_READY_STATES.OPEN) {
        console.log('Ping sent');
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000);

    // Cleanup
    return () => {
      window.clearInterval(pingInterval);
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      socket.close();
    };
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    const cleanup = connect();
    
    // Cleanup on component unmount
    return () => {
      cleanup();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  // Send message to WebSocket server
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current?.readyState === WS_READY_STATES.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

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