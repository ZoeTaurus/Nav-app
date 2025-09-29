import sqlite3 from 'sqlite3';
import { promisify } from 'util';

let db: sqlite3.Database;

export const setupDatabase = async () => {
  return new Promise<void>((resolve, reject) => {
    db = new sqlite3.Database('roadtime.db', (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('📊 Connected to SQLite database');
      initializeTables().then(resolve).catch(reject);
    });
  });
};

const initializeTables = async () => {
  const run = promisify(db.run.bind(db));
  
  try {
    // Routes table
    await run(`
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
        created_at INTEGER NOT NULL,
        user_id TEXT DEFAULT 'anonymous'
      )
    `);

    // Route sessions table
    await run(`
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
        user_id TEXT DEFAULT 'anonymous',
        FOREIGN KEY (route_id) REFERENCES routes (id)
      )
    `);

    // Route points table
    await run(`
      CREATE TABLE IF NOT EXISTS route_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        speed REAL,
        accuracy REAL,
        FOREIGN KEY (session_id) REFERENCES route_sessions (id)
      )
    `);

    // Speed bumps table
    await run(`
      CREATE TABLE IF NOT EXISTS speed_bumps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        intensity INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        user_id TEXT NOT NULL DEFAULT 'anonymous',
        detection_method TEXT DEFAULT 'simulated',
        FOREIGN KEY (session_id) REFERENCES route_sessions (id)
      )
    `);

    // Traffic data table
    await run(`
      CREATE TABLE IF NOT EXISTS traffic_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        speed REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        time_of_day TEXT NOT NULL,
        day_of_week TEXT NOT NULL,
        user_id TEXT NOT NULL DEFAULT 'anonymous',
        FOREIGN KEY (session_id) REFERENCES route_sessions (id)
      )
    `);

    // Community speed bumps table
    await run(`
      CREATE TABLE IF NOT EXISTS community_speed_bumps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        intensity INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        user_id TEXT NOT NULL DEFAULT 'anonymous',
        verified_count INTEGER DEFAULT 1,
        last_verified INTEGER,
        detection_method TEXT DEFAULT 'user_reported'
      )
    `);

    // Community traffic data table
    await run(`
      CREATE TABLE IF NOT EXISTS community_traffic_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        speed REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        time_of_day TEXT NOT NULL,
        day_of_week TEXT NOT NULL,
        user_id TEXT NOT NULL DEFAULT 'anonymous',
        weather_condition TEXT,
        road_condition TEXT
      )
    `);

    // User sessions for web tracking
    await run(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_agent TEXT,
        ip_address TEXT,
        created_at INTEGER NOT NULL,
        last_active INTEGER NOT NULL
      )
    `);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Error initializing database tables:', error);
    throw error;
  }
};

export const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

export const closeDatabase = () => {
  return new Promise<void>((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('📊 Database connection closed');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
};

// Utility functions for common database operations
export const dbGet = (sql: string, params: any[] = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (sql: string, params: any[] = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const dbRun = (sql: string, params: any[] = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
};
