// This file is the entry point for the app
// It must be at the root level to ensure background message handler is registered early
import { setupBackgroundMessageHandler } from './src/notifications/firebasePush';

// Register FCM background message handler BEFORE any React components load
setupBackgroundMessageHandler();

// Import the actual expo-router entry point
// eslint-disable-next-line import/first
import 'expo-router/entry';
