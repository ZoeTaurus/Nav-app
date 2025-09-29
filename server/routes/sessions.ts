import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbAll, dbRun } from '../database';

const router = express.Router();

interface RoutePoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed?: number;
  accuracy?: number;
}

interface SpeedBumpData {
  latitude: number;
  longitude: number;
  intensity: number;
  timestamp: number;
  userId: string;
  detectionMethod?: string;
}

interface TrafficData {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: number;
  timeOfDay: string;
  dayOfWeek: string;
  userId: string;
}

interface RouteSession {
  id: string;
  routeId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  distance: number;
  averageSpeed: number;
  maxSpeed: number;
  points: RoutePoint[];
  speedBumps: SpeedBumpData[];
  trafficData: TrafficData[];
  completed: boolean;
  userId?: string;
}

// Get all sessions for a route
router.get('/route/:routeId', async (req, res) => {
  try {
    const routeId = req.params.routeId;
    
    const sessions = await dbAll(`
      SELECT * FROM route_sessions 
      WHERE route_id = ? 
      ORDER BY start_time DESC
    `, [routeId]) as any[];

    const formattedSessions: RouteSession[] = await Promise.all(
      sessions.map(async (session) => {
        const [points, speedBumps, trafficData] = await Promise.all([
          getRoutePoints(session.id),
          getSpeedBumps(session.id),
          getTrafficData(session.id)
        ]);

        return {
          id: session.id,
          routeId: session.route_id,
          startTime: session.start_time,
          endTime: session.end_time,
          duration: session.duration,
          distance: session.distance,
          averageSpeed: session.average_speed,
          maxSpeed: session.max_speed,
          points,
          speedBumps,
          trafficData,
          completed: session.completed === 1,
          userId: session.user_id,
        };
      })
    );

    res.json(formattedSessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get session by ID
router.get('/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    
    const session = await dbGet(`
      SELECT * FROM route_sessions WHERE id = ?
    `, [sessionId]) as any;

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const [points, speedBumps, trafficData] = await Promise.all([
      getRoutePoints(sessionId),
      getSpeedBumps(sessionId),
      getTrafficData(sessionId)
    ]);

    const formattedSession: RouteSession = {
      id: session.id,
      routeId: session.route_id,
      startTime: session.start_time,
      endTime: session.end_time,
      duration: session.duration,
      distance: session.distance,
      averageSpeed: session.average_speed,
      maxSpeed: session.max_speed,
      points,
      speedBumps,
      trafficData,
      completed: session.completed === 1,
      userId: session.user_id,
    };

    res.json(formattedSession);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Create new session
router.post('/', async (req, res) => {
  try {
    const { routeId } = req.body;
    
    if (!routeId) {
      return res.status(400).json({ error: 'Route ID is required' });
    }

    const sessionId = uuidv4();
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    await dbRun(`
      INSERT INTO route_sessions (
        id, route_id, start_time, distance, average_speed, max_speed, completed, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [sessionId, routeId, Date.now(), 0, 0, 0, 0, userId]);

    const newSession: RouteSession = {
      id: sessionId,
      routeId,
      startTime: Date.now(),
      distance: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      points: [],
      speedBumps: [],
      trafficData: [],
      completed: false,
      userId,
    };

    res.status(201).json(newSession);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Update session (complete it)
router.put('/:id/complete', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { points, speedBumps, trafficData } = req.body;

    const session = await dbGet(
      'SELECT * FROM route_sessions WHERE id = ?',
      [sessionId]
    ) as any;

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const endTime = Date.now();
    const duration = endTime - session.start_time;

    // Calculate metrics
    const speeds = points?.map((p: any) => p.speed || 0).filter((s: number) => s > 0) || [];
    const averageSpeed = speeds.length > 0 ? speeds.reduce((a: number, b: number) => a + b, 0) / speeds.length : 0;
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
    
    // Calculate distance using Haversine formula
    let distance = 0;
    if (points && points.length > 1) {
      for (let i = 1; i < points.length; i++) {
        distance += calculateDistance(
          points[i-1].latitude,
          points[i-1].longitude,
          points[i].latitude,
          points[i].longitude
        );
      }
    }

    // Update session
    await dbRun(`
      UPDATE route_sessions SET 
        end_time = ?, duration = ?, distance = ?, average_speed = ?, max_speed = ?, completed = 1
      WHERE id = ?
    `, [endTime, duration, distance, averageSpeed, maxSpeed, sessionId]);

    // Save points, speed bumps, and traffic data
    if (points) await saveRoutePoints(sessionId, points);
    if (speedBumps) await saveSpeedBumps(sessionId, speedBumps);
    if (trafficData) await saveTrafficData(sessionId, trafficData);

    res.json({ message: 'Session completed successfully' });
  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

// Add point to session (real-time tracking)
router.post('/:id/points', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const point = req.body;

    await dbRun(`
      INSERT INTO route_points (session_id, latitude, longitude, timestamp, speed, accuracy)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [sessionId, point.latitude, point.longitude, point.timestamp, point.speed, point.accuracy]);

    res.json({ message: 'Point added successfully' });
  } catch (error) {
    console.error('Error adding point:', error);
    res.status(500).json({ error: 'Failed to add point' });
  }
});

// Add speed bump detection
router.post('/:id/speed-bumps', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const speedBump = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';

    await dbRun(`
      INSERT INTO speed_bumps (session_id, latitude, longitude, intensity, timestamp, user_id, detection_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      sessionId, 
      speedBump.latitude, 
      speedBump.longitude, 
      speedBump.intensity, 
      speedBump.timestamp || Date.now(), 
      userId,
      speedBump.detectionMethod || 'web_simulation'
    ]);

    res.json({ message: 'Speed bump added successfully' });
  } catch (error) {
    console.error('Error adding speed bump:', error);
    res.status(500).json({ error: 'Failed to add speed bump' });
  }
});

// Helper functions
async function getRoutePoints(sessionId: string): Promise<RoutePoint[]> {
  const points = await dbAll(`
    SELECT * FROM route_points WHERE session_id = ? ORDER BY timestamp
  `, [sessionId]) as any[];

  return points.map(point => ({
    latitude: point.latitude,
    longitude: point.longitude,
    timestamp: point.timestamp,
    speed: point.speed,
    accuracy: point.accuracy,
  }));
}

async function getSpeedBumps(sessionId: string): Promise<SpeedBumpData[]> {
  const speedBumps = await dbAll(`
    SELECT * FROM speed_bumps WHERE session_id = ? ORDER BY timestamp
  `, [sessionId]) as any[];

  return speedBumps.map(bump => ({
    latitude: bump.latitude,
    longitude: bump.longitude,
    intensity: bump.intensity,
    timestamp: bump.timestamp,
    userId: bump.user_id,
    detectionMethod: bump.detection_method,
  }));
}

async function getTrafficData(sessionId: string): Promise<TrafficData[]> {
  const trafficData = await dbAll(`
    SELECT * FROM traffic_data WHERE session_id = ? ORDER BY timestamp
  `, [sessionId]) as any[];

  return trafficData.map(data => ({
    latitude: data.latitude,
    longitude: data.longitude,
    speed: data.speed,
    timestamp: data.timestamp,
    timeOfDay: data.time_of_day,
    dayOfWeek: data.day_of_week,
    userId: data.user_id,
  }));
}

async function saveRoutePoints(sessionId: string, points: RoutePoint[]) {
  for (const point of points) {
    await dbRun(`
      INSERT INTO route_points (session_id, latitude, longitude, timestamp, speed, accuracy)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [sessionId, point.latitude, point.longitude, point.timestamp, point.speed, point.accuracy]);
  }
}

async function saveSpeedBumps(sessionId: string, speedBumps: SpeedBumpData[]) {
  for (const bump of speedBumps) {
    await dbRun(`
      INSERT INTO speed_bumps (session_id, latitude, longitude, intensity, timestamp, user_id, detection_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [sessionId, bump.latitude, bump.longitude, bump.intensity, bump.timestamp, bump.userId, bump.detectionMethod || 'web_simulation']);
  }
}

async function saveTrafficData(sessionId: string, trafficData: TrafficData[]) {
  for (const data of trafficData) {
    await dbRun(`
      INSERT INTO traffic_data (session_id, latitude, longitude, speed, timestamp, time_of_day, day_of_week, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [sessionId, data.latitude, data.longitude, data.speed, data.timestamp, data.timeOfDay, data.dayOfWeek, data.userId]);
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export { router as sessionRoutes };
