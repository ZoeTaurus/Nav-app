// Simple Railway deployment script
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist/client')));

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

// Serve React app for all other routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist/client/index.html');
  console.log('Serving index.html from:', indexPath);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).send('Error loading application');
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Nav-app is running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} to view the app`);
  console.log(`🌐 Server bound to 0.0.0.0:${PORT} for Railway`);
});

module.exports = app;
