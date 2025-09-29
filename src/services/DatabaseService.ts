import * as SQLite from 'expo-sqlite';
import { Route, RouteSession, SpeedBumpData, TrafficData } from '../context/RouteContext';

export class DatabaseService {
  private db: SQLite.WebSQLDatabase;

  constructor() {
    this.db = SQLite.openDatabase('roadtime.db');
    this.initializeTables();
  }

  private initializeTables() {
    this.db.transaction(tx => {
      // Routes table
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS routes (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          start_lat REAL NOT NULL,
          start_lng REAL NOT NULL,
          start_address TEXT NOT NULL,
          end_lat REAL NOT NULL,
          end_lng REAL NOT NULL,
          end_address TEXT NOT NULL,
          waypoints TEXT,
          created_at INTEGER NOT NULL
        );
      `);

      // Route sessions table
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS route_sessions (
          id TEXT PRIMARY KEY,
          route_id TEXT NOT NULL,
          start_time INTEGER NOT NULL,
          end_time INTEGER,
          duration INTEGER,
          distance REAL NOT NULL DEFAULT 0,
          average_speed REAL NOT NULL DEFAULT 0,
          max_speed REAL NOT NULL DEFAULT 0,
          completed INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (route_id) REFERENCES routes (id)
        );
      `);

      // Route points table
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS route_points (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          timestamp INTEGER NOT NULL,
          speed REAL,
          accuracy REAL,
          FOREIGN KEY (session_id) REFERENCES route_sessions (id)
        );
      `);

      // Speed bumps table
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS speed_bumps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          intensity INTEGER NOT NULL,
          timestamp INTEGER NOT NULL,
          user_id TEXT NOT NULL,
          FOREIGN KEY (session_id) REFERENCES route_sessions (id)
        );
      `);

      // Traffic data table
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS traffic_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          speed REAL NOT NULL,
          timestamp INTEGER NOT NULL,
          time_of_day TEXT NOT NULL,
          day_of_week TEXT NOT NULL,
          user_id TEXT NOT NULL,
          FOREIGN KEY (session_id) REFERENCES route_sessions (id)
        );
      `);

      // Community speed bumps table (crowd-sourced data)
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS community_speed_bumps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          intensity INTEGER NOT NULL,
          timestamp INTEGER NOT NULL,
          user_id TEXT NOT NULL,
          verified_count INTEGER DEFAULT 1,
          last_verified INTEGER
        );
      `);

      // Community traffic data table (crowd-sourced data)
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS community_traffic_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          speed REAL NOT NULL,
          timestamp INTEGER NOT NULL,
          time_of_day TEXT NOT NULL,
          day_of_week TEXT NOT NULL,
          user_id TEXT NOT NULL
        );
      `);
    });
  }

  // Route operations
  async saveRoute(route: Route): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO routes (id, name, start_lat, start_lng, start_address, end_lat, end_lng, end_address, waypoints, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            route.id,
            route.name,
            route.startPoint.latitude,
            route.startPoint.longitude,
            route.startPoint.address,
            route.endPoint.latitude,
            route.endPoint.longitude,
            route.endPoint.address,
            route.waypoints ? JSON.stringify(route.waypoints) : null,
            route.createdAt,
          ],
          () => resolve(),
          (_, error) => {
            reject(error);
            return true;
          }
        );
      });
    });
  }

  async getRoutes(): Promise<Route[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM routes ORDER BY created_at DESC',
          [],
          (_, { rows }) => {
            const routes: Route[] = [];
            for (let i = 0; i < rows.length; i++) {
              const row = rows.item(i);
              routes.push({
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
              });
            }
            resolve(routes);
          },
          (_, error) => {
            reject(error);
            return true;
          }
        );
      });
    });
  }

  async deleteRoute(routeId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        // Delete related data first
        tx.executeSql('DELETE FROM traffic_data WHERE session_id IN (SELECT id FROM route_sessions WHERE route_id = ?)', [routeId]);
        tx.executeSql('DELETE FROM speed_bumps WHERE session_id IN (SELECT id FROM route_sessions WHERE route_id = ?)', [routeId]);
        tx.executeSql('DELETE FROM route_points WHERE session_id IN (SELECT id FROM route_sessions WHERE route_id = ?)', [routeId]);
        tx.executeSql('DELETE FROM route_sessions WHERE route_id = ?', [routeId]);
        tx.executeSql(
          'DELETE FROM routes WHERE id = ?',
          [routeId],
          () => resolve(),
          (_, error) => {
            reject(error);
            return true;
          }
        );
      });
    });
  }

  // Session operations
  async saveSession(session: RouteSession): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO route_sessions 
           (id, route_id, start_time, end_time, duration, distance, average_speed, max_speed, completed)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            session.id,
            session.routeId,
            session.startTime,
            session.endTime || null,
            session.duration || null,
            session.distance,
            session.averageSpeed,
            session.maxSpeed,
            session.completed ? 1 : 0,
          ],
          () => resolve(),
          (_, error) => {
            reject(error);
            return true;
          }
        );
      });
    });
  }

  async saveRoutePoints(sessionId: string, points: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        // Clear existing points for this session
        tx.executeSql('DELETE FROM route_points WHERE session_id = ?', [sessionId]);
        
        // Insert new points
        points.forEach(point => {
          tx.executeSql(
            'INSERT INTO route_points (session_id, latitude, longitude, timestamp, speed, accuracy) VALUES (?, ?, ?, ?, ?, ?)',
            [sessionId, point.latitude, point.longitude, point.timestamp, point.speed || null, point.accuracy || null]
          );
        });
      }, reject, resolve);
    });
  }

  async saveSpeedBumps(sessionId: string, speedBumps: SpeedBumpData[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        // Clear existing speed bumps for this session
        tx.executeSql('DELETE FROM speed_bumps WHERE session_id = ?', [sessionId]);
        
        // Insert new speed bumps
        speedBumps.forEach(bump => {
          tx.executeSql(
            'INSERT INTO speed_bumps (session_id, latitude, longitude, intensity, timestamp, user_id) VALUES (?, ?, ?, ?, ?, ?)',
            [sessionId, bump.latitude, bump.longitude, bump.intensity, bump.timestamp, bump.userId]
          );
        });
      }, reject, resolve);
    });
  }

  async saveTrafficData(sessionId: string, trafficData: TrafficData[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        // Clear existing traffic data for this session
        tx.executeSql('DELETE FROM traffic_data WHERE session_id = ?', [sessionId]);
        
        // Insert new traffic data
        trafficData.forEach(data => {
          tx.executeSql(
            'INSERT INTO traffic_data (session_id, latitude, longitude, speed, timestamp, time_of_day, day_of_week, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [sessionId, data.latitude, data.longitude, data.speed, data.timestamp, data.timeOfDay, data.dayOfWeek, data.userId]
          );
        });
      }, reject, resolve);
    });
  }

  async getRouteSessions(routeId?: string): Promise<RouteSession[]> {
    return new Promise((resolve, reject) => {
      const query = routeId 
        ? 'SELECT * FROM route_sessions WHERE route_id = ? ORDER BY start_time DESC'
        : 'SELECT * FROM route_sessions ORDER BY start_time DESC';
      const params = routeId ? [routeId] : [];

      this.db.transaction(tx => {
        tx.executeSql(
          query,
          params,
          async (_, { rows }) => {
            const sessions: RouteSession[] = [];
            
            for (let i = 0; i < rows.length; i++) {
              const row = rows.item(i);
              
              // Get related data
              const points = await this.getRoutePoints(row.id);
              const speedBumps = await this.getSpeedBumps(row.id);
              const trafficData = await this.getTrafficData(row.id);
              
              sessions.push({
                id: row.id,
                routeId: row.route_id,
                startTime: row.start_time,
                endTime: row.end_time,
                duration: row.duration,
                distance: row.distance,
                averageSpeed: row.average_speed,
                maxSpeed: row.max_speed,
                points,
                speedBumps,
                trafficData,
                completed: row.completed === 1,
              });
            }
            resolve(sessions);
          },
          (_, error) => {
            reject(error);
            return true;
          }
        );
      });
    });
  }

  private async getRoutePoints(sessionId: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM route_points WHERE session_id = ? ORDER BY timestamp',
          [sessionId],
          (_, { rows }) => {
            const points = [];
            for (let i = 0; i < rows.length; i++) {
              const row = rows.item(i);
              points.push({
                latitude: row.latitude,
                longitude: row.longitude,
                timestamp: row.timestamp,
                speed: row.speed,
                accuracy: row.accuracy,
              });
            }
            resolve(points);
          },
          (_, error) => {
            reject(error);
            return true;
          }
        );
      });
    });
  }

  private async getSpeedBumps(sessionId: string): Promise<SpeedBumpData[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM speed_bumps WHERE session_id = ? ORDER BY timestamp',
          [sessionId],
          (_, { rows }) => {
            const speedBumps = [];
            for (let i = 0; i < rows.length; i++) {
              const row = rows.item(i);
              speedBumps.push({
                latitude: row.latitude,
                longitude: row.longitude,
                intensity: row.intensity,
                timestamp: row.timestamp,
                userId: row.user_id,
              });
            }
            resolve(speedBumps);
          },
          (_, error) => {
            reject(error);
            return true;
          }
        );
      });
    });
  }

  private async getTrafficData(sessionId: string): Promise<TrafficData[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM traffic_data WHERE session_id = ? ORDER BY timestamp',
          [sessionId],
          (_, { rows }) => {
            const trafficData = [];
            for (let i = 0; i < rows.length; i++) {
              const row = rows.item(i);
              trafficData.push({
                latitude: row.latitude,
                longitude: row.longitude,
                speed: row.speed,
                timestamp: row.timestamp,
                timeOfDay: row.time_of_day,
                dayOfWeek: row.day_of_week,
                userId: row.user_id,
              });
            }
            resolve(trafficData);
          },
          (_, error) => {
            reject(error);
            return true;
          }
        );
      });
    });
  }

  // Community data operations
  async contributeToCommunityData(speedBumps: SpeedBumpData[], trafficData: TrafficData[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        // Add speed bumps to community data
        speedBumps.forEach(bump => {
          // Check if similar speed bump exists nearby (within 50 meters)
          tx.executeSql(`
            SELECT id, verified_count FROM community_speed_bumps 
            WHERE ABS(latitude - ?) < 0.0005 AND ABS(longitude - ?) < 0.0005
          `, [bump.latitude, bump.longitude], (_, { rows }) => {
            if (rows.length > 0) {
              // Update existing record
              const existing = rows.item(0);
              tx.executeSql(`
                UPDATE community_speed_bumps 
                SET verified_count = ?, last_verified = ?
                WHERE id = ?
              `, [existing.verified_count + 1, bump.timestamp, existing.id]);
            } else {
              // Insert new record
              tx.executeSql(`
                INSERT INTO community_speed_bumps 
                (latitude, longitude, intensity, timestamp, user_id, verified_count, last_verified)
                VALUES (?, ?, ?, ?, ?, 1, ?)
              `, [bump.latitude, bump.longitude, bump.intensity, bump.timestamp, bump.userId, bump.timestamp]);
            }
          });
        });

        // Add traffic data to community data
        trafficData.forEach(data => {
          tx.executeSql(`
            INSERT INTO community_traffic_data 
            (latitude, longitude, speed, timestamp, time_of_day, day_of_week, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [data.latitude, data.longitude, data.speed, data.timestamp, data.timeOfDay, data.dayOfWeek, data.userId]);
        });
      }, reject, resolve);
    });
  }

  async getCommunitySpeedBumps(bounds: { north: number; south: number; east: number; west: number }): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(`
          SELECT latitude, longitude, AVG(intensity) as avg_intensity, verified_count, MAX(last_verified) as last_verified
          FROM community_speed_bumps 
          WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?
          GROUP BY ROUND(latitude, 4), ROUND(longitude, 4)
          ORDER BY verified_count DESC
        `, [bounds.south, bounds.north, bounds.west, bounds.east], (_, { rows }) => {
          const speedBumps = [];
          for (let i = 0; i < rows.length; i++) {
            speedBumps.push(rows.item(i));
          }
          resolve(speedBumps);
        }, (_, error) => {
          reject(error);
          return true;
        });
      });
    });
  }

  async getCommunityTrafficData(bounds: { north: number; south: number; east: number; west: number }, timeRange?: { start: number; end: number }): Promise<any[]> {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT latitude, longitude, AVG(speed) as avg_speed, COUNT(*) as data_points, time_of_day, day_of_week
        FROM community_traffic_data 
        WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?
      `;
      let params = [bounds.south, bounds.north, bounds.west, bounds.east];

      if (timeRange) {
        query += ' AND timestamp BETWEEN ? AND ?';
        params.push(timeRange.start, timeRange.end);
      }

      query += ' GROUP BY ROUND(latitude, 4), ROUND(longitude, 4), time_of_day, day_of_week';

      this.db.transaction(tx => {
        tx.executeSql(query, params, (_, { rows }) => {
          const trafficData = [];
          for (let i = 0; i < rows.length; i++) {
            trafficData.push(rows.item(i));
          }
          resolve(trafficData);
        }, (_, error) => {
          reject(error);
          return true;
        });
      });
    });
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        const tables = [
          'traffic_data',
          'speed_bumps', 
          'route_points',
          'route_sessions',
          'routes',
          'community_traffic_data',
          'community_speed_bumps'
        ];
        
        tables.forEach(table => {
          tx.executeSql(`DELETE FROM ${table}`);
        });
      }, reject, resolve);
    });
  }

  async exportData(): Promise<any> {
    const routes = await this.getRoutes();
    const sessions = await this.getRouteSessions();
    
    return {
      routes,
      sessions,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}

// Singleton instance
export const databaseService = new DatabaseService();
