import express from 'express';
import { dbGet, dbAll } from '../database';

const router = express.Router();

interface RouteAnalytics {
  routeId: string;
  totalSessions: number;
  averageDuration: number;
  averageSpeed: number;
  fastestTime: number;
  slowestTime: number;
  averageDistance: number;
  speedBumpCount: number;
  trafficHotspots: Array<{ latitude: number; longitude: number; frequency: number }>;
  bestTimeOfDay: string;
  worstTimeOfDay: string;
  completionRate: number;
  popularDays: Array<{ day: string; count: number }>;
}

// Get analytics for a specific route
router.get('/route/:routeId', async (req, res) => {
  try {
    const routeId = req.params.routeId;
    
    const sessions = await dbAll(`
      SELECT * FROM route_sessions 
      WHERE route_id = ? AND completed = 1
      ORDER BY start_time DESC
    `, [routeId]) as any[];

    if (sessions.length === 0) {
      return res.json({
        routeId,
        totalSessions: 0,
        averageDuration: 0,
        averageSpeed: 0,
        fastestTime: 0,
        slowestTime: 0,
        averageDistance: 0,
        speedBumpCount: 0,
        trafficHotspots: [],
        bestTimeOfDay: 'N/A',
        worstTimeOfDay: 'N/A',
        completionRate: 0,
        popularDays: [],
      });
    }

    // Calculate basic metrics
    const durations = sessions.map((s: any) => s.duration).filter((d: number) => d > 0);
    const speeds = sessions.map((s: any) => s.average_speed).filter((s: number) => s > 0);
    const distances = sessions.map((s: any) => s.distance);

    const analytics: RouteAnalytics = {
      routeId,
      totalSessions: sessions.length,
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      averageSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
      fastestTime: durations.length > 0 ? Math.min(...durations) : 0,
      slowestTime: durations.length > 0 ? Math.max(...durations) : 0,
      averageDistance: distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : 0,
      speedBumpCount: await getSpeedBumpCount(routeId),
      trafficHotspots: await getTrafficHotspots(routeId),
      ...await getTimeAnalysis(routeId),
      completionRate: await getCompletionRate(routeId),
      popularDays: await getPopularDays(routeId),
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching route analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get overall analytics across all routes
router.get('/overview', async (req, res) => {
  try {
    const totalRoutes = await dbGet('SELECT COUNT(*) as count FROM routes') as any;
    const totalSessions = await dbGet('SELECT COUNT(*) as count FROM route_sessions WHERE completed = 1') as any;
    const totalDistance = await dbGet('SELECT SUM(distance) as total FROM route_sessions WHERE completed = 1') as any;
    const totalSpeedBumps = await dbGet('SELECT COUNT(*) as count FROM speed_bumps') as any;
    
    const averageSpeed = await dbGet(`
      SELECT AVG(average_speed) as avg_speed 
      FROM route_sessions 
      WHERE completed = 1 AND average_speed > 0
    `) as any;

    const topRoutes = await dbAll(`
      SELECT r.name, r.id, COUNT(rs.id) as session_count, AVG(rs.duration) as avg_duration
      FROM routes r
      LEFT JOIN route_sessions rs ON r.id = rs.route_id AND rs.completed = 1
      GROUP BY r.id
      ORDER BY session_count DESC
      LIMIT 5
    `) as any[];

    const recentActivity = await dbAll(`
      SELECT rs.*, r.name as route_name
      FROM route_sessions rs
      JOIN routes r ON rs.route_id = r.id
      WHERE rs.completed = 1
      ORDER BY rs.end_time DESC
      LIMIT 10
    `) as any[];

    res.json({
      totalRoutes: totalRoutes.count,
      totalSessions: totalSessions.count,
      totalDistance: (totalDistance.total || 0) / 1000, // Convert to km
      totalSpeedBumps: totalSpeedBumps.count,
      averageSpeed: averageSpeed.avg_speed || 0,
      topRoutes: topRoutes.map(route => ({
        id: route.id,
        name: route.name,
        sessionCount: route.session_count,
        averageDuration: route.avg_duration || 0,
      })),
      recentActivity: recentActivity.map(session => ({
        id: session.id,
        routeName: session.route_name,
        endTime: session.end_time,
        duration: session.duration,
        distance: session.distance,
        averageSpeed: session.average_speed,
      })),
    });
  } catch (error) {
    console.error('Error fetching overview analytics:', error);
    res.status(500).json({ error: 'Failed to fetch overview analytics' });
  }
});

// Get comparative analytics between routes
router.get('/compare', async (req, res) => {
  try {
    const routeIds = req.query.routes as string;
    
    if (!routeIds) {
      return res.status(400).json({ error: 'Route IDs are required' });
    }

    const routeIdArray = routeIds.split(',');
    const comparisons = [];

    for (const routeId of routeIdArray) {
      const analytics = await getRouteAnalytics(routeId);
      const route = await dbGet('SELECT name FROM routes WHERE id = ?', [routeId]) as any;
      
      comparisons.push({
        routeId,
        routeName: route?.name || 'Unknown Route',
        ...analytics,
      });
    }

    res.json(comparisons);
  } catch (error) {
    console.error('Error fetching comparative analytics:', error);
    res.status(500).json({ error: 'Failed to fetch comparative analytics' });
  }
});

// Helper functions
async function getSpeedBumpCount(routeId: string): Promise<number> {
  const result = await dbGet(`
    SELECT COUNT(*) as count 
    FROM speed_bumps sb
    JOIN route_sessions rs ON sb.session_id = rs.id
    WHERE rs.route_id = ?
  `, [routeId]) as any;
  
  return result.count;
}

async function getTrafficHotspots(routeId: string): Promise<Array<{ latitude: number; longitude: number; frequency: number }>> {
  const trafficData = await dbAll(`
    SELECT td.latitude, td.longitude, COUNT(*) as frequency
    FROM traffic_data td
    JOIN route_sessions rs ON td.session_id = rs.id
    WHERE rs.route_id = ?
    GROUP BY ROUND(td.latitude, 4), ROUND(td.longitude, 4)
    HAVING frequency > 1
    ORDER BY frequency DESC
    LIMIT 10
  `, [routeId]) as any[];

  return trafficData.map(data => ({
    latitude: data.latitude,
    longitude: data.longitude,
    frequency: data.frequency,
  }));
}

async function getTimeAnalysis(routeId: string): Promise<{ bestTimeOfDay: string; worstTimeOfDay: string }> {
  const hourlyData = await dbAll(`
    SELECT 
      CAST(strftime('%H', datetime(start_time/1000, 'unixepoch')) AS INTEGER) as hour,
      AVG(duration) as avg_duration,
      COUNT(*) as count
    FROM route_sessions
    WHERE route_id = ? AND completed = 1 AND duration > 0
    GROUP BY hour
    HAVING count >= 2
    ORDER BY avg_duration ASC
  `, [routeId]) as any[];

  if (hourlyData.length === 0) {
    return { bestTimeOfDay: 'N/A', worstTimeOfDay: 'N/A' };
  }

  const bestHour = hourlyData[0].hour;
  const worstHour = hourlyData[hourlyData.length - 1].hour;

  return {
    bestTimeOfDay: `${bestHour.toString().padStart(2, '0')}:00`,
    worstTimeOfDay: `${worstHour.toString().padStart(2, '0')}:00`,
  };
}

async function getCompletionRate(routeId: string): Promise<number> {
  const totalSessions = await dbGet(
    'SELECT COUNT(*) as count FROM route_sessions WHERE route_id = ?',
    [routeId]
  ) as any;

  const completedSessions = await dbGet(
    'SELECT COUNT(*) as count FROM route_sessions WHERE route_id = ? AND completed = 1',
    [routeId]
  ) as any;

  if (totalSessions.count === 0) return 0;
  
  return (completedSessions.count / totalSessions.count) * 100;
}

async function getPopularDays(routeId: string): Promise<Array<{ day: string; count: number }>> {
  const dayData = await dbAll(`
    SELECT 
      CASE CAST(strftime('%w', datetime(start_time/1000, 'unixepoch')) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
      END as day,
      COUNT(*) as count
    FROM route_sessions
    WHERE route_id = ? AND completed = 1
    GROUP BY day
    ORDER BY count DESC
  `, [routeId]) as any[];

  return dayData;
}

async function getRouteAnalytics(routeId: string) {
  // This is a simplified version of the main analytics function
  const sessions = await dbAll(`
    SELECT * FROM route_sessions 
    WHERE route_id = ? AND completed = 1
  `, [routeId]) as any[];

  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      averageDuration: 0,
      averageSpeed: 0,
      averageDistance: 0,
    };
  }

  const durations = sessions.map((s: any) => s.duration).filter((d: number) => d > 0);
  const speeds = sessions.map((s: any) => s.average_speed).filter((s: number) => s > 0);
  const distances = sessions.map((s: any) => s.distance);

  return {
    totalSessions: sessions.length,
    averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    averageSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
    averageDistance: distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : 0,
  };
}

export { router as analyticsRoutes };
