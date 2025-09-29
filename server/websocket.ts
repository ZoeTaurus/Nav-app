import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

interface WebSocketMessage {
  type: string;
  sessionId?: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  timestamp?: number;
  intensity?: number;
  userId?: string;
  data?: any;
}

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  sessionId?: string;
}

export const setupWebSocket = (wss: WebSocketServer) => {
  const clients = new Set<ExtendedWebSocket>();

  wss.on('connection', (ws: ExtendedWebSocket, request: IncomingMessage) => {
    console.log('New WebSocket connection established');
    clients.add(ws);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'WebSocket connection established',
      timestamp: Date.now()
    }));

    ws.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        handleMessage(ws, message, clients);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: Date.now()
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  return wss;
};

const handleMessage = (ws: ExtendedWebSocket, message: WebSocketMessage, clients: Set<ExtendedWebSocket>) => {
  console.log('Received WebSocket message:', message.type);

  switch (message.type) {
    case 'join_session':
      ws.sessionId = message.sessionId;
      ws.userId = message.userId;
      console.log(`User ${message.userId} joined session ${message.sessionId}`);
      break;

    case 'location_update':
      // Broadcast location update to other clients in the same session
      broadcastToSession(message.sessionId!, {
        type: 'live_location',
        ...message
      }, clients, ws);
      break;

    case 'speed_bump_detected':
      // Broadcast speed bump detection to all clients
      broadcast({
        type: 'community_speed_bump',
        ...message
      }, clients, ws);
      break;

    case 'session_update':
      // Broadcast session status updates
      broadcastToSession(message.sessionId!, {
        type: 'session_status',
        ...message
      }, clients, ws);
      break;

    case 'ping':
      // Respond to ping with pong
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: Date.now()
      }));
      break;

    default:
      console.log('Unknown message type:', message.type);
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${message.type}`,
        timestamp: Date.now()
      }));
  }
};

const broadcast = (message: any, clients: Set<ExtendedWebSocket>, sender?: ExtendedWebSocket) => {
  const messageStr = JSON.stringify(message);
  
  clients.forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageStr);
      } catch (error) {
        console.error('Error sending broadcast message:', error);
      }
    }
  });
};

const broadcastToSession = (sessionId: string, message: any, clients: Set<ExtendedWebSocket>, sender?: ExtendedWebSocket) => {
  const messageStr = JSON.stringify(message);
  
  clients.forEach((client) => {
    if (client !== sender && client.sessionId === sessionId && client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageStr);
      } catch (error) {
        console.error('Error sending session broadcast message:', error);
      }
    }
  });
};