// Generate Firebase credentials from environment variables during config evaluation
// This ensures the credentials exist BEFORE other plugins try to use them

const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');

const TURN_ON_FIREBASE =
  process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
  process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';

function isActualBuild() {
  // Check if we're in an actual build context (not expo doctor, expo config, etc.)
  const buildCommands = ['prebuild', 'run:ios', 'run:android'];
  return (
    process.argv.some((arg) => buildCommands.some((cmd) => arg.includes(cmd))) ||
    process.env.EAS_BUILD_PLATFORM // EAS sets this during builds
  );
}

function detectPlatform() {
  // Try to detect platform from environment or CLI args
  // EAS sets EAS_BUILD_PLATFORM, also check process.argv for --platform
  const easPlatform = process.env.EAS_BUILD_PLATFORM;
  if (easPlatform) {
    return easPlatform.toLowerCase();
  }

  // Check command line arguments for --platform ios/android
  const platformArgIndex = process.argv.indexOf('--platform');
  if (platformArgIndex !== -1 && process.argv[platformArgIndex + 1]) {
    return process.argv[platformArgIndex + 1].toLowerCase();
  }

  // Unable to detect - return null to generate both
  return null;
}

function generateCredentials(projectRoot) {
  if (!TURN_ON_FIREBASE) {
    return;
  }

  const platform = detectPlatform();
  const credentialsDir = path.join(projectRoot, 'credentials');

  // Create credentials directory if it doesn't exist
  if (!fs.existsSync(credentialsDir)) {
    fs.mkdirSync(credentialsDir, { recursive: true });
  }

  // Generate iOS plist (if platform is iOS or unknown)
  if (!platform || platform === 'ios') {
    const plistBase64 = process.env.GOOGLE_SERVICE_INFO_PLIST_B64;
    const plistPath = path.join(credentialsDir, 'GoogleService-Info.plist');

    if (plistBase64) {
      const plistContent = Buffer.from(plistBase64, 'base64').toString('utf-8');
      fs.writeFileSync(plistPath, plistContent, 'utf-8');
      console.log('✅ Generated GoogleService-Info.plist from environment variable');
    } else if (fs.existsSync(plistPath)) {
      console.log('ℹ️  Using existing GoogleService-Info.plist from credentials/');
    } else if (platform === 'ios') {
      // Only warn if we're definitely building for iOS
      console.warn('⚠️  GOOGLE_SERVICE_INFO_PLIST_B64 not set and no local credentials file found');
      console.warn('   Add credentials/GoogleService-Info.plist for iOS builds');
    }
  }

  // Generate Android JSON (if platform is Android or unknown)
  if (!platform || platform === 'android') {
    const jsonBase64 = process.env.GOOGLE_SERVICES_JSON_B64;
    const jsonPath = path.join(credentialsDir, 'google-services.json');

    if (jsonBase64) {
      const jsonContent = Buffer.from(jsonBase64, 'base64').toString('utf-8');
      fs.writeFileSync(jsonPath, jsonContent, 'utf-8');
      console.log('✅ Generated google-services.json from environment variable');
    } else if (fs.existsSync(jsonPath)) {
      console.log('ℹ️  Using existing google-services.json from credentials/');
    } else if (platform === 'android') {
      // Only warn if we're definitely building for Android
      console.warn('⚠️  GOOGLE_SERVICES_JSON_B64 not set and no local credentials file found');
      console.warn('   Add credentials/google-services.json for Android builds');
    }
  }
}

module.exports = function withFirebaseCredentials(config) {
  // Skip if credentials have already been generated in this process
  // This prevents duplicate generation when config is evaluated multiple times
  if (global.__FIREBASE_CREDENTIALS_GENERATED__) {
    return config;
  }

  // Only generate during actual builds (not expo doctor, expo config, etc.)
  if (!isActualBuild()) {
    return config;
  }

  // Generate credentials immediately when this plugin is evaluated
  // This happens BEFORE other plugins (like @react-native-firebase/app) try to copy them
  const projectRoot = config._internal?.projectRoot || process.cwd();
  generateCredentials(projectRoot);

  // Mark as generated to prevent duplicate execution
  global.__FIREBASE_CREDENTIALS_GENERATED__ = true;

  return config;
};
