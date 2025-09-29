const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver for web platform
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;
