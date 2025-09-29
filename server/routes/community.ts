import express from 'express';
import { dbGet, dbAll, dbRun } from '../database';

const router = express.Router();

// Get community speed bumps in a bounding box
router.get('/speed-bumps', async (req, res) => {
  try {
    const { north, south, east, west } = req.query;
    
    if (!north || !south || !east || !west) {
      return res.status(400).json({ 
        error: 'Bounding box coordinates required: north, south, east, west' 
      });
    }

    const speedBumps = await dbAll(`
      SELECT 
        ROUND(latitude, 4) as latitude,
        ROUND(longitude, 4) as longitude,
        AVG(intensity) as avg_intensity,
        SUM(verified_count) as total_verifications,
        MAX(last_verified) as last_verified,
        COUNT(*) as report_count
      FROM community_speed_bumps 
      WHERE latitude BETWEEN ? AND ? 
        AND longitude BETWEEN ? AND ?
      GROUP BY ROUND(latitude, 4), ROUND(longitude, 4)
      ORDER BY total_verifications DESC
    `, [south, north, west, east]) as any[];

    const formattedSpeedBumps = speedBumps.map(bump => ({
      latitude: bump.latitude,
      longitude: bump.longitude,
      intensity: Math.round(bump.avg_intensity),
      verifications: bump.total_verifications,
      lastVerified: bump.last_verified,
      reports: bump.report_count,
      confidence: Math.min(bump.total_verifications * 10, 100), // 0-100 confidence score
    }));

    res.json(formattedSpeedBumps);
  } catch (error) {
    console.error('Error fetching community speed bumps:', error);
    res.status(500).json({ error: 'Failed to fetch community speed bumps' });
  }
});

// Report a speed bump
router.post('/speed-bumps', async (req, res) => {
  try {
    const { latitude, longitude, intensity, detectionMethod } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    if (!latitude || !longitude || !intensity) {
      return res.status(400).json({ 
        error: 'Latitude, longitude, and intensity are required' 
      });
    }

    const timestamp = Date.now();

    // Check if there's a similar speed bump nearby (within ~50 meters)
    const existingBump = await dbGet(`
      SELECT id, verified_count 
      FROM community_speed_bumps 
      WHERE ABS(latitude - ?) < 0.0005 AND ABS(longitude - ?) < 0.0005
      ORDER BY ABS(latitude - ?) + ABS(longitude - ?) ASC
      LIMIT 1
    `, [latitude, longitude, latitude, longitude]) as any;

    if (existingBump) {
      // Update existing speed bump
      await dbRun(`
        UPDATE community_speed_bumps 
        SET verified_count = verified_count + 1, 
            last_verified = ?,
            intensity = ROUND((intensity * verified_count + ?) / (verified_count + 1))
        WHERE id = ?
      `, [timestamp, intensity, existingBump.id]);

      res.json({ 
        message: 'Speed bump verification added',
        verified: true,
        verifications: existingBump.verified_count + 1
      });
    } else {
      // Create new speed bump record
      await dbRun(`
        INSERT INTO community_speed_bumps 
        (latitude, longitude, intensity, timestamp, user_id, verified_count, last_verified, detection_method)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      `, [latitude, longitude, intensity, timestamp, userId, timestamp, detectionMethod || 'user_reported']);

      res.status(201).json({ 
        message: 'New speed bump reported',
        verified: false,
        verifications: 1
      });
    }

    // Also contribute to overall analytics
    await contributeToTrafficData(latitude, longitude, userId);
    
  } catch (error) {
    console.error('Error reporting speed bump:', error);
    res.status(500).json({ error: 'Failed to report speed bump' });
  }
});

// Get community traffic data
router.get('/traffic', async (req, res) => {
  try {
    const { north, south, east, west, timeRange } = req.query;
    
    if (!north || !south || !east || !west) {
      return res.status(400).json({ 
        error: 'Bounding box coordinates required: north, south, east, west' 
      });
    }

    let timeFilter = '';
    let params = [south, north, west, east];

    if (timeRange) {
      const [start, end] = (timeRange as string).split(',');
      timeFilter = ' AND timestamp BETWEEN ? AND ?';
      params.push(start, end);
    }

    const trafficData = await dbAll(`
      SELECT 
        ROUND(latitude, 3) as latitude,
        ROUND(longitude, 3) as longitude,
        AVG(speed) as avg_speed,
        COUNT(*) as data_points,
        time_of_day,
        day_of_week,
        MIN(speed) as min_speed,
        MAX(speed) as max_speed
      FROM community_traffic_data 
      WHERE latitude BETWEEN ? AND ? 
        AND longitude BETWEEN ? AND ? 
        ${timeFilter}
      GROUP BY ROUND(latitude, 3), ROUND(longitude, 3), time_of_day, day_of_week
      HAVING data_points >= 3
      ORDER BY data_points DESC
    `, params) as any[];

    const formattedTrafficData = trafficData.map(data => ({
      latitude: data.latitude,
      longitude: data.longitude,
      averageSpeed: Math.round(data.avg_speed * 100) / 100,
      dataPoints: data.data_points,
      timeOfDay: data.time_of_day,
      dayOfWeek: data.day_of_week,
      speedRange: {
        min: data.min_speed,
        max: data.max_speed,
      },
      reliability: Math.min(data.data_points * 5, 100), // 0-100 reliability score
    }));

    res.json(formattedTrafficData);
  } catch (error) {
    console.error('Error fetching community traffic data:', error);
    res.status(500).json({ error: 'Failed to fetch community traffic data' });
  }
});

// Contribute traffic data
router.post('/traffic', async (req, res) => {
  try {
    const { latitude, longitude, speed, timeOfDay, dayOfWeek, weatherCondition, roadCondition } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    if (!latitude || !longitude || speed === undefined) {
      return res.status(400).json({ 
        error: 'Latitude, longitude, and speed are required' 
      });
    }

    const timestamp = Date.now();
    const now = new Date();
    const calculatedTimeOfDay = timeOfDay || `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    const calculatedDayOfWeek = dayOfWeek || now.toLocaleDateString('en-US', { weekday: 'long' });

    await dbRun(`
      INSERT INTO community_traffic_data 
      (latitude, longitude, speed, timestamp, time_of_day, day_of_week, user_id, weather_condition, road_condition)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [latitude, longitude, speed, timestamp, calculatedTimeOfDay, calculatedDayOfWeek, userId, weatherCondition, roadCondition]);

    res.status(201).json({ message: 'Traffic data contributed successfully' });
  } catch (error) {
    console.error('Error contributing traffic data:', error);
    res.status(500).json({ error: 'Failed to contribute traffic data' });
  }
});

// Get traffic patterns for a specific area
router.get('/traffic/patterns', async (req, res) => {
  try {
    const { latitude, longitude, radius = 0.01 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required' 
      });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const rad = parseFloat(radius as string);

    // Get hourly patterns
    const hourlyPatterns = await dbAll(`
      SELECT 
        CAST(strftime('%H', time_of_day) AS INTEGER) as hour,
        AVG(speed) as avg_speed,
        COUNT(*) as data_points,
        MIN(speed) as min_speed,
        MAX(speed) as max_speed
      FROM community_traffic_data 
      WHERE latitude BETWEEN ? AND ? 
        AND longitude BETWEEN ? AND ?
      GROUP BY hour
      ORDER BY hour
    `, [lat - rad, lat + rad, lng - rad, lng + rad]) as any[];

    // Get daily patterns
    const dailyPatterns = await dbAll(`
      SELECT 
        day_of_week,
        AVG(speed) as avg_speed,
        COUNT(*) as data_points
      FROM community_traffic_data 
      WHERE latitude BETWEEN ? AND ? 
        AND longitude BETWEEN ? AND ?
      GROUP BY day_of_week
      ORDER BY 
        CASE day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 7
        END
    `, [lat - rad, lat + rad, lng - rad, lng + rad]) as any[];

    res.json({
      location: { latitude: lat, longitude: lng, radius: rad },
      hourlyPatterns: hourlyPatterns.map(pattern => ({
        hour: pattern.hour,
        averageSpeed: Math.round(pattern.avg_speed * 100) / 100,
        dataPoints: pattern.data_points,
        speedRange: {
          min: pattern.min_speed,
          max: pattern.max_speed,
        },
      })),
      dailyPatterns: dailyPatterns.map(pattern => ({
        day: pattern.day_of_week,
        averageSpeed: Math.round(pattern.avg_speed * 100) / 100,
        dataPoints: pattern.data_points,
      })),
    });
  } catch (error) {
    console.error('Error fetching traffic patterns:', error);
    res.status(500).json({ error: 'Failed to fetch traffic patterns' });
  }
});

// Get community statistics
router.get('/stats', async (req, res) => {
  try {
    const speedBumpStats = await dbGet(`
      SELECT 
        COUNT(DISTINCT id) as total_reports,
        SUM(verified_count) as total_verifications,
        AVG(intensity) as avg_intensity
      FROM community_speed_bumps
    `) as any;

    const trafficStats = await dbGet(`
      SELECT 
        COUNT(*) as total_contributions,
        COUNT(DISTINCT user_id) as unique_contributors,
        AVG(speed) as avg_speed
      FROM community_traffic_data
    `) as any;

    const recentActivity = await dbAll(`
      SELECT 'speed_bump' as type, timestamp, latitude, longitude, user_id
      FROM community_speed_bumps
      WHERE timestamp > ?
      UNION ALL
      SELECT 'traffic_data' as type, timestamp, latitude, longitude, user_id
      FROM community_traffic_data
      WHERE timestamp > ?
      ORDER BY timestamp DESC
      LIMIT 20
    `, [Date.now() - 24 * 60 * 60 * 1000, Date.now() - 24 * 60 * 60 * 1000]) as any[];

    res.json({
      speedBumps: {
        totalReports: speedBumpStats.total_reports || 0,
        totalVerifications: speedBumpStats.total_verifications || 0,
        averageIntensity: Math.round((speedBumpStats.avg_intensity || 0) * 100) / 100,
      },
      traffic: {
        totalContributions: trafficStats.total_contributions || 0,
        uniqueContributors: trafficStats.unique_contributors || 0,
        averageSpeed: Math.round((trafficStats.avg_speed || 0) * 100) / 100,
      },
      recentActivity: recentActivity.map(activity => ({
        type: activity.type,
        timestamp: activity.timestamp,
        location: {
          latitude: activity.latitude,
          longitude: activity.longitude,
        },
        anonymous: activity.user_id === 'anonymous',
      })),
    });
  } catch (error) {
    console.error('Error fetching community stats:', error);
    res.status(500).json({ error: 'Failed to fetch community stats' });
  }
});

// Helper function to contribute general traffic data
async function contributeToTrafficData(latitude: number, longitude: number, userId: string) {
  const now = new Date();
  const timeOfDay = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

  await dbRun(`
    INSERT INTO community_traffic_data 
    (latitude, longitude, speed, timestamp, time_of_day, day_of_week, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [latitude, longitude, 0, Date.now(), timeOfDay, dayOfWeek, userId]);
}

export { router as communityRoutes };
