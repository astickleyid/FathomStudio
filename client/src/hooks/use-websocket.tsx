import { useState, useEffect, useCallback, useRef } from 'react';

export enum ReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

export interface UseWebSocketOptions {
  onOpen?: (event: WebSocketEventMap['open']) => void;
  onClose?: (event: WebSocketEventMap['close']) => void;
  onMessage?: (event: WebSocketEventMap['message']) => void;
  onError?: (event: WebSocketEventMap['error']) => void;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  shouldReconnect?: boolean;
  pingInterval?: number;
  pingMessage?: string;
}

export const useWebSocket = (
  url: string,
  {
    onOpen,
    onClose,
    onMessage,
    onError,
    reconnectInterval = 5000,
    reconnectAttempts = Infinity,
    shouldReconnect = true,
    pingInterval = 30000,
    pingMessage = JSON.stringify({ type: 'ping' }),
  }: UseWebSocketOptions = {}
) => {
  const [readyState, setReadyState] = useState<ReadyState>(ReadyState.CONNECTING);
  const [lastMessage, setLastMessage] = useState<WebSocketEventMap['message'] | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    // Clean up any existing socket
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Clear any existing intervals/timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingTimeoutRef.current) {
      clearInterval(pingTimeoutRef.current);
      pingTimeoutRef.current = null;
    }

    try {
      // Create a new WebSocket connection
      const ws = new WebSocket(url);
      socketRef.current = ws;
      setReadyState(ReadyState.CONNECTING);

      // Setup event handlers
      ws.onopen = (event) => {
        console.log('WebSocket connection established');
        setReadyState(ReadyState.OPEN);
        reconnectAttemptsRef.current = 0;
        
        // Set up ping interval to keep connection alive
        if (pingInterval > 0) {
          pingTimeoutRef.current = window.setInterval(() => {
            if (ws.readyState === ReadyState.OPEN) {
              ws.send(pingMessage);
              console.log('Ping sent');
            }
          }, pingInterval);
        }
        
        if (onOpen) {
          onOpen(event);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed');
        setReadyState(ReadyState.CLOSED);
        
        // Clear ping interval
        if (pingTimeoutRef.current) {
          clearInterval(pingTimeoutRef.current);
          pingTimeoutRef.current = null;
        }
        
        if (onClose) {
          onClose(event);
        }

        // Attempt to reconnect if enabled and under max attempts
        if (shouldReconnect && reconnectAttemptsRef.current < reconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = window.setTimeout(() => {
            console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${reconnectAttempts})`);
            connect();
          }, reconnectInterval);
        }
      };

      ws.onmessage = (event) => {
        setLastMessage(event);
        if (onMessage) {
          onMessage(event);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        if (onError) {
          onError(event);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [url, onOpen, onClose, onMessage, onError, reconnectInterval, reconnectAttempts, shouldReconnect, pingInterval, pingMessage]);

  // Send a message through the WebSocket
  const sendMessage = useCallback((message: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    if (socketRef.current && socketRef.current.readyState === ReadyState.OPEN) {
      socketRef.current.send(message);
      return true;
    }
    return false;
  }, []);

  // Connect on initial render and when the URL changes
  useEffect(() => {
    connect();

    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (pingTimeoutRef.current) {
        clearInterval(pingTimeoutRef.current);
      }
    };
  }, [connect]);

  return {
    sendMessage,
    lastMessage,
    readyState,
    reconnect: connect,
    getWebSocket: () => socketRef.current,
  };
};

export default useWebSocket;