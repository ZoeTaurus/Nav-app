// Simple Railway deployment script
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Starting Nav-app server...');
console.log('📍 Environment:', process.env.NODE_ENV || 'development');
console.log('🔌 Port:', PORT);
console.log('📂 Working directory:', __dirname);

// Check if dist/client exists
const clientPath = path.join(__dirname, 'dist/client');
console.log('🔍 Checking client path:', clientPath);
if (fs.existsSync(clientPath)) {
  console.log('✅ Client build found');
  const indexExists = fs.existsSync(path.join(clientPath, 'index.html'));
  console.log('📄 index.html exists:', indexExists);
} else {
  console.log('❌ Client build NOT found - this might be the problem!');
}

// Middleware
app.use(cors());
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(express.static(clientPath));

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Basic API endpoints
app.get('/api/routes', (req, res) => {
  res.json([]);
});

app.post('/api/routes', (req, res) => {
  res.json({ id: Date.now().toString(), ...req.body });
});

// Add a simple root response for Railway health check
app.get('/', (req, res) => {
  const indexPath = path.join(clientPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <html>
        <head><title>Nav-app Status</title></head>
        <body>
          <h1>🛣️ Nav-app Server Running</h1>
          <p>✅ Server is responding on port ${PORT}</p>
          <p>❌ Client build not found at: ${clientPath}</p>
          <p>🔧 Check Railway build logs for client build issues</p>
          <a href="/api/health">Health Check</a>
        </body>
      </html>
    `);
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  const indexPath = path.join(clientPath, 'index.html');
  console.log('Serving index.html from:', indexPath);
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        res.status(500).send('Error loading application');
      }
    });
  } else {
    res.status(404).send('Client build not found - check Railway build logs');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Nav-app is running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} to view the app`);
  console.log(`🌐 Server bound to 0.0.0.0:${PORT} for Railway`);
});

module.exports = app;
