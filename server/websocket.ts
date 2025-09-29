import { WebSocketServer, WebSocket } from 'ws';

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  sessionId?: string;
  isAlive?: boolean;
}

interface LocationUpdate {
  type: 'location_update';
  sessionId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  timestamp: number;
}

interface SpeedBumpDetected {
  type: 'speed_bump_detected';
  sessionId: string;
  latitude: number;
  longitude: number;
  intensity: number;
  timestamp: number;
}

interface SessionUpdate {
  type: 'session_update';
  sessionId: string;
  status: 'started' | 'completed' | 'paused';
  data?: any;
}

type WebSocketMessage = LocationUpdate | SpeedBumpDetected | SessionUpdate;

export const setupWebSocket = (wss: WebSocketServer) => {
  console.log('🔌 Setting up WebSocket server...');

  wss.on('connection', (ws: ExtendedWebSocket, req) => {
    console.log('📱 New WebSocket connection established');
    
    ws.isAlive = true;
    ws.userId = extractUserIdFromRequest(req);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to Road Time Measurement server',
      timestamp: Date.now(),
    }));

    // Handle incoming messages
    ws.on('message', async (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        await handleWebSocketMessage(ws, message, wss);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: Date.now(),
        }));
      }
    });

    // Handle connection close
    ws.on('close', () => {
      console.log('📱 WebSocket connection closed');
    });

    // Handle connection errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Heartbeat to keep connection alive
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  });

  // Set up heartbeat interval
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: ExtendedWebSocket) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // 30 seconds

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  console.log('✅ WebSocket server setup complete');
};

async function handleWebSocketMessage(
  ws: ExtendedWebSocket, 
  message: WebSocketMessage, 
  wss: WebSocketServer
) {
  switch (message.type) {
    case 'location_update':
      await handleLocationUpdate(ws, message, wss);
      break;
      
    case 'speed_bump_detected':
      await handleSpeedBumpDetection(ws, message, wss);
      break;
      
    case 'session_update':
      await handleSessionUpdate(ws, message, wss);
      break;
      
    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Unknown message type',
        timestamp: Date.now(),
      }));
  }
}

async function handleLocationUpdate(
  ws: ExtendedWebSocket, 
  message: LocationUpdate, 
  wss: WebSocketServer
) {
  // Store the session ID for this connection
  ws.sessionId = message.sessionId;

  // Broadcast location update to other clients tracking the same session
  const locationUpdateBroadcast = {
    type: 'live_location',
    sessionId: message.sessionId,
    latitude: message.latitude,
    longitude: message.longitude,
    speed: message.speed,
    timestamp: message.timestamp,
    userId: ws.userId,
  };

  broadcastToOthers(wss, ws, locationUpdateBroadcast);

  // Acknowledge receipt
  ws.send(JSON.stringify({
    type: 'location_update_ack',
    sessionId: message.sessionId,
    timestamp: Date.now(),
  }));
}

async function handleSpeedBumpDetection(
  ws: ExtendedWebSocket, 
  message: SpeedBumpDetected, 
  wss: WebSocketServer
) {
  // Broadcast speed bump detection to all clients
  const speedBumpBroadcast = {
    type: 'community_speed_bump',
    latitude: message.latitude,
    longitude: message.longitude,
    intensity: message.intensity,
    timestamp: message.timestamp,
    sessionId: message.sessionId,
    userId: ws.userId,
  };

  broadcastToAll(wss, speedBumpBroadcast);

  // Send confirmation to the reporting client
  ws.send(JSON.stringify({
    type: 'speed_bump_reported',
    message: 'Speed bump reported to community',
    timestamp: Date.now(),
  }));
}

async function handleSessionUpdate(
  ws: ExtendedWebSocket, 
  message: SessionUpdate, 
  wss: WebSocketServer
) {
  ws.sessionId = message.sessionId;

  // Broadcast session status to interested clients
  const sessionBroadcast = {
    type: 'session_status',
    sessionId: message.sessionId,
    status: message.status,
    timestamp: Date.now(),
    userId: ws.userId,
    data: message.data,
  };

  broadcastToOthers(wss, ws, sessionBroadcast);

  // Send acknowledgment
  ws.send(JSON.stringify({
    type: 'session_update_ack',
    sessionId: message.sessionId,
    status: message.status,
    timestamp: Date.now(),
  }));
}

function broadcastToAll(wss: WebSocketServer, message: any) {
  const messageString = JSON.stringify(message);
  
  wss.clients.forEach((client: ExtendedWebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}

function broadcastToOthers(wss: WebSocketServer, sender: ExtendedWebSocket, message: any) {
  const messageString = JSON.stringify(message);
  
  wss.clients.forEach((client: ExtendedWebSocket) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}

function extractUserIdFromRequest(req: any): string {
  // Extract user ID from headers, query parameters, or generate anonymous ID
  const userAgent = req.headers['user-agent'] || '';
  const forwarded = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  
  // Create a simple hash for anonymous user identification
  const hash = require('crypto')
    .createHash('md5')
    .update(userAgent + forwarded)
    .digest('hex')
    .substring(0, 8);
    
  return `anon_${hash}`;
}

// Utility function to send real-time notifications
export const sendRealtimeNotification = (wss: WebSocketServer, notification: any) => {
  broadcastToAll(wss, {
    type: 'notification',
    ...notification,
    timestamp: Date.now(),
  });
};
