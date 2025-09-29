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
  res.sendFile(path.join(__dirname, 'dist/client/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Nav-app is running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} to view the app`);
});

module.exports = app;
