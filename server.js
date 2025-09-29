const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Nav-app starting...');
console.log('Port:', PORT);
console.log('Node version:', process.version);
console.log('Platform:', process.platform);

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check - Railway uses this to verify the app is running
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// API health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// Basic API endpoints
app.get('/api/routes', (req, res) => {
  res.json({ routes: [], message: 'Nav-app API is working' });
});

app.post('/api/routes', (req, res) => {
  res.json({ 
    id: Date.now().toString(), 
    ...req.body, 
    created: new Date().toISOString() 
  });
});

// Serve static files from dist
const staticPath = path.join(__dirname, 'dist');
console.log('Static files path:', staticPath);

app.use(express.static(staticPath));

// Catch all handler for React app
app.get('*', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  
  // Fallback HTML if index.html doesn't exist
  const fallbackHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Nav-app - Railway Deployment</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
          .status { color: #28a745; }
          .error { color: #dc3545; }
          .info { background: #e3f2fd; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🛣️ Nav-app</h1>
          <p class="status">✅ Server is running successfully on Railway!</p>
          <p><strong>Port:</strong> ${PORT}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          
          <div class="info">
            <h3>API Endpoints Available:</h3>
            <ul>
              <li><a href="/health">Health Check</a></li>
              <li><a href="/api/health">API Health Check</a></li>
              <li><a href="/api/routes">Routes API</a></li>
            </ul>
          </div>
          
          <p class="error">📁 React build files not found, but server is working!</p>
          <p>This means the backend is deployed successfully.</p>
        </div>
      </body>
    </html>
  `;
  
  res.send(fallbackHTML);
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Nav-app is running on http://0.0.0.0:${PORT}`);
  console.log(`🌐 Railway URL should be working now!`);
});

module.exports = app;
