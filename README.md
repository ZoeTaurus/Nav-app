# Nav-app (Road Time Measurement)

A comprehensive mobile application for tracking and analyzing travel routes, measuring journey times, detecting speed bumps, and analyzing traffic patterns through crowd-sourced data.

## Features

### 🗺️ Route Management
- Create and save custom routes with start/end points
- Interactive map interface for route selection
- Multiple route comparison capabilities

### 📍 GPS Tracking
- High-accuracy GPS tracking during journeys
- Real-time speed and location monitoring
- Background tracking support
- Route recording with detailed analytics

### 🚧 Speed Bump Detection
- Automatic speed bump detection using device accelerometer
- Intensity measurement (1-10 scale)
- Community verification system
- Speed bump mapping and alerts

### 📊 Advanced Analytics
- Journey time analysis and optimization
- Speed pattern recognition
- Route comparison with statistical insights
- Performance trends over time
- Best/worst travel time recommendations

### 🌐 Crowd-Sourced Data
- Anonymous traffic data sharing
- Community speed bump reporting
- Traffic pattern analysis from multiple users
- Collaborative route optimization

### 🎯 Smart Insights
- Time-of-day traffic recommendations
- Route efficiency scoring
- Historical performance tracking
- Weather and traffic correlation

## Technology Stack

- **Framework**: React Native with Expo
- **Maps**: React Native Maps (Google Maps)
- **Database**: SQLite with Expo SQLite
- **Navigation**: React Navigation 6
- **Sensors**: Expo Sensors (Accelerometer, Location)
- **Charts**: React Native Chart Kit
- **State Management**: React Context API

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Road time mesurment tool"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Google Maps API**
   - Get a Google Maps API key from Google Cloud Console
   - Enable Maps SDK for Android and iOS
   - Add the API key to your environment configuration

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on device/simulator**
   ```bash
   # For iOS
   npm run ios
   
   # For Android
   npm run android
   ```

## Permissions Required

### iOS
- Location (Always and When In Use)
- Motion & Fitness (for accelerometer)

### Android
- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
- ACCESS_BACKGROUND_LOCATION

## Usage Guide

### 1. Creating Routes
1. Navigate to the "Routes" tab
2. Tap "New Route" 
3. Enter route name and addresses
4. Set start and end points on the map
5. Save the route

### 2. Tracking Journeys
1. Select a route from the Routes tab
2. Go to the "Track" tab
3. Tap "Start Tracking" to begin recording
4. The app will track your location, speed, and detect speed bumps
5. Tap "Stop Tracking" when you reach your destination

### 3. Viewing Analytics
1. Navigate to the "Analytics" tab
2. Select "All Routes" for comparison or specific route for details
3. View performance metrics, charts, and insights
4. Analyze traffic patterns and route efficiency

### 4. Settings & Data Management
1. Go to "Settings" tab
2. Configure tracking preferences
3. Manage location permissions
4. Export or clear data as needed
5. Toggle community data sharing

## Key Components

### Context Providers
- **LocationContext**: Manages GPS tracking and location services
- **RouteContext**: Handles route data, sessions, and analytics

### Core Services
- **DatabaseService**: SQLite database operations and data persistence
- **Crowd-sourced data management**: Community data aggregation

### Screen Components
- **HomeScreen**: Dashboard with overview and recent activity
- **RouteSelectionScreen**: Route creation and selection interface
- **TrackingScreen**: Real-time journey tracking with sensor integration
- **AnalyticsScreen**: Comprehensive analytics and route comparison
- **SettingsScreen**: App configuration and data management

## Data Privacy

- Location data is stored locally on your device by default
- Community data sharing is optional and anonymous
- No personal information is collected or shared
- You can export or delete all data at any time

## Performance Considerations

- GPS accuracy depends on device capabilities and environment
- Speed bump detection sensitivity can be adjusted
- Background tracking may impact battery life
- Large datasets are optimized for performance

## Contributing

This app is designed to be extensible. Key areas for enhancement:
- Additional sensor integration (gyroscope, magnetometer)
- Machine learning for traffic prediction
- Integration with external traffic services
- Advanced route optimization algorithms
- Social features and route sharing

## Technical Architecture

### Data Flow
1. GPS coordinates → Location Context
2. Accelerometer data → Speed bump detection algorithm
3. Route tracking → Session recording
4. Analytics computation → Insights generation
5. Community data → Aggregated traffic patterns

### Database Schema
- Routes table with geographic coordinates
- Sessions table with journey metadata
- Points table with GPS tracking data
- Speed bumps table with detection data
- Traffic data table with crowd-sourced information

### Sensor Integration
- **Accelerometer**: Magnitude-based speed bump detection
- **GPS**: High-frequency location tracking
- **Device motion**: Road surface analysis

## Troubleshooting

### Common Issues

1. **Location not detected**
   - Ensure location permissions are granted
   - Check GPS signal strength
   - Try restarting location services

2. **Speed bump detection not working**
   - Verify device has accelerometer
   - Check sensitivity settings
   - Ensure app has motion permissions

3. **Performance issues**
   - Clear old tracking data
   - Reduce GPS update frequency
   - Check available device storage

### Support
For technical issues or feature requests, please check the app settings or contact support through the in-app help section.

## License

This project is developed for educational and practical purposes. Please ensure compliance with local regulations regarding location tracking and data collection.

## Version History

- **v1.0.0**: Initial release with core tracking and analytics features
