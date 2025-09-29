const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const dotenv = require('dotenv');

const { setupDatabase } = require('./database');
const { routeRoutes } = require('./routes/routes');
const { sessionRoutes } = require('./routes/sessions');
const { analyticsRoutes } = require('./routes/analytics');
const { communityRoutes } = require('./routes/community');
const { setupWebSocket } = require('./websocket');

dotenv.config();

const __dirname = path.resolve();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:", "https:"],
      fontSrc: ["'self'", "https:"],
    },
  },
}));

app.use(compression());
app.use(cors({
  origin: NODE_ENV === 'production' 
    ? ['https://your-railway-domain.up.railway.app'] 
    : ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize and start server
async function startServer() {
  try {
    // Initialize database
    await setupDatabase();

    // API routes
    app.use('/api/routes', routeRoutes);
    app.use('/api/sessions', sessionRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/community', communityRoutes);

    // Health check
    app.get('/api/health', (req: any, res: any) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: NODE_ENV 
      });
    });

    // Serve static files in production
    if (NODE_ENV === 'production') {
      const clientPath = path.join(__dirname, '../client');
      app.use(express.static(clientPath));
      
      app.get('*', (req: any, res: any) => {
        res.sendFile(path.join(clientPath, 'index.html'));
      });
    }

    // WebSocket setup for real-time features
    setupWebSocket(wss);

    // Error handling middleware
    app.use((err: any, req: any, res: any, next: any) => {
      console.error('Error:', err);
      res.status(500).json({ 
        error: NODE_ENV === 'production' ? 'Internal server error' : err.message 
      });
    });

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${NODE_ENV}`);
      console.log(`🌐 WebSocket server ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server, wss };
