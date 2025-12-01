// Generate Firebase credentials from environment variables during prebuild
// This ensures the credentials exist in the EAS build directory

const { withDangerousMod } = require('@expo/config-plugins');
const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');

const TURN_ON_FIREBASE =
  process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
  process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';

module.exports = function withFirebaseCredentials(config) {
  if (!TURN_ON_FIREBASE) {
    return config;
  }

  // Create iOS plist from base64 secret
  config = withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const plistBase64 = process.env.GOOGLE_SERVICE_INFO_PLIST_B64;

      if (plistBase64) {
        const credentialsDir = path.join(modConfig.modRequest.projectRoot, 'credentials');
        const plistPath = path.join(credentialsDir, 'GoogleService-Info.plist');

        // Create credentials directory if it doesn't exist
        if (!fs.existsSync(credentialsDir)) {
          fs.mkdirSync(credentialsDir, { recursive: true });
        }

        // Write plist file from base64
        const plistContent = Buffer.from(plistBase64, 'base64').toString('utf-8');
        fs.writeFileSync(plistPath, plistContent, 'utf-8');

        console.log('✅ Generated GoogleService-Info.plist from environment variable');
      } else {
        console.warn(
          '⚠️  GOOGLE_SERVICE_INFO_PLIST_B64 not set, skipping iOS Firebase credentials',
        );
      }

      return modConfig;
    },
  ]);

  // Create Android JSON from base64 secret
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const jsonBase64 = process.env.GOOGLE_SERVICES_JSON_B64;

      if (jsonBase64) {
        const credentialsDir = path.join(modConfig.modRequest.projectRoot, 'credentials');
        const jsonPath = path.join(credentialsDir, 'google-services.json');

        // Create credentials directory if it doesn't exist
        if (!fs.existsSync(credentialsDir)) {
          fs.mkdirSync(credentialsDir, { recursive: true });
        }

        // Write JSON file from base64
        const jsonContent = Buffer.from(jsonBase64, 'base64').toString('utf-8');
        fs.writeFileSync(jsonPath, jsonContent, 'utf-8');

        console.log('✅ Generated google-services.json from environment variable');
      } else {
        console.warn('⚠️  GOOGLE_SERVICES_JSON_B64 not set, skipping Android Firebase credentials');
      }

      return modConfig;
    },
  ]);

  return config;
};
