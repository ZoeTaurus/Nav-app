import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbAll, dbRun } from '../database';

const router = express.Router();

interface Route {
  id: string;
  name: string;
  startPoint: {
    latitude: number;
    longitude: number;
    address: string;
  };
  endPoint: {
    latitude: number;
    longitude: number;
    address: string;
  };
  waypoints?: Array<{ latitude: number; longitude: number }>;
  createdAt: number;
  userId?: string;
}

// Get all routes
router.get('/', async (req, res) => {
  try {
    const routes = await dbAll(`
      SELECT * FROM routes 
      ORDER BY created_at DESC
    `) as any[];

    const formattedRoutes: Route[] = routes.map(row => ({
      id: row.id,
      name: row.name,
      startPoint: {
        latitude: row.start_lat,
        longitude: row.start_lng,
        address: row.start_address,
      },
      endPoint: {
        latitude: row.end_lat,
        longitude: row.end_lng,
        address: row.end_address,
      },
      waypoints: row.waypoints ? JSON.parse(row.waypoints) : undefined,
      createdAt: row.created_at,
      userId: row.user_id,
    }));

    res.json(formattedRoutes);
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

// Get route by ID
router.get('/:id', async (req, res) => {
  try {
    const route = await dbGet(
      'SELECT * FROM routes WHERE id = ?',
      [req.params.id]
    ) as any;

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const formattedRoute: Route = {
      id: route.id,
      name: route.name,
      startPoint: {
        latitude: route.start_lat,
        longitude: route.start_lng,
        address: route.start_address,
      },
      endPoint: {
        latitude: route.end_lat,
        longitude: route.end_lng,
        address: route.end_address,
      },
      waypoints: route.waypoints ? JSON.parse(route.waypoints) : undefined,
      createdAt: route.created_at,
      userId: route.user_id,
    };

    res.json(formattedRoute);
  } catch (error) {
    console.error('Error fetching route:', error);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
});

// Create new route
router.post('/', async (req, res) => {
  try {
    const { name, startPoint, endPoint, waypoints } = req.body;
    
    if (!name || !startPoint || !endPoint) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, startPoint, endPoint' 
      });
    }

    const routeId = uuidv4();
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    await dbRun(`
      INSERT INTO routes (
        id, name, start_lat, start_lng, start_address, 
        end_lat, end_lng, end_address, waypoints, created_at, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      routeId,
      name,
      startPoint.latitude,
      startPoint.longitude,
      startPoint.address,
      endPoint.latitude,
      endPoint.longitude,
      endPoint.address,
      waypoints ? JSON.stringify(waypoints) : null,
      Date.now(),
      userId
    ]);

    const newRoute: Route = {
      id: routeId,
      name,
      startPoint,
      endPoint,
      waypoints,
      createdAt: Date.now(),
      userId,
    };

    res.status(201).json(newRoute);
  } catch (error) {
    console.error('Error creating route:', error);
    res.status(500).json({ error: 'Failed to create route' });
  }
});

// Update route
router.put('/:id', async (req, res) => {
  try {
    const { name, startPoint, endPoint, waypoints } = req.body;
    const routeId = req.params.id;

    const existingRoute = await dbGet(
      'SELECT * FROM routes WHERE id = ?',
      [routeId]
    );

    if (!existingRoute) {
      return res.status(404).json({ error: 'Route not found' });
    }

    await dbRun(`
      UPDATE routes SET 
        name = ?, start_lat = ?, start_lng = ?, start_address = ?,
        end_lat = ?, end_lng = ?, end_address = ?, waypoints = ?
      WHERE id = ?
    `, [
      name,
      startPoint.latitude,
      startPoint.longitude,
      startPoint.address,
      endPoint.latitude,
      endPoint.longitude,
      endPoint.address,
      waypoints ? JSON.stringify(waypoints) : null,
      routeId
    ]);

    const updatedRoute: Route = {
      id: routeId,
      name,
      startPoint,
      endPoint,
      waypoints,
      createdAt: (existingRoute as any).created_at,
      userId: (existingRoute as any).user_id,
    };

    res.json(updatedRoute);
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({ error: 'Failed to update route' });
  }
});

// Delete route
router.delete('/:id', async (req, res) => {
  try {
    const routeId = req.params.id;

    // Check if route exists
    const existingRoute = await dbGet(
      'SELECT * FROM routes WHERE id = ?',
      [routeId]
    );

    if (!existingRoute) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Delete related data first
    await dbRun(
      'DELETE FROM traffic_data WHERE session_id IN (SELECT id FROM route_sessions WHERE route_id = ?)',
      [routeId]
    );
    
    await dbRun(
      'DELETE FROM speed_bumps WHERE session_id IN (SELECT id FROM route_sessions WHERE route_id = ?)',
      [routeId]
    );
    
    await dbRun(
      'DELETE FROM route_points WHERE session_id IN (SELECT id FROM route_sessions WHERE route_id = ?)',
      [routeId]
    );
    
    await dbRun(
      'DELETE FROM route_sessions WHERE route_id = ?',
      [routeId]
    );
    
    await dbRun(
      'DELETE FROM routes WHERE id = ?',
      [routeId]
    );

    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({ error: 'Failed to delete route' });
  }
});

export { router as routeRoutes };
