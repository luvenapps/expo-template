const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to configure Podfile for Firebase compatibility
 * Uses use_modular_headers! which is required for Firebase Swift pods
 */
const withFirebaseModularHeaders = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        console.warn('Podfile not found, skipping Firebase Podfile configuration');
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      // Check if use_modular_headers! is already present
      if (podfileContent.includes('use_modular_headers!')) {
        console.log('use_modular_headers! already present in Podfile');
        return config;
      }

      // Add use_modular_headers! right after the target declaration
      // This is required for Firebase Swift pods to work properly
      const targetRegex = /(target ['"][^'"]+['"] do\s*\n)/;
      if (targetRegex.test(podfileContent)) {
        podfileContent = podfileContent.replace(targetRegex, '$1  use_modular_headers!\n\n');
        fs.writeFileSync(podfilePath, podfileContent, 'utf8');
        console.log('Added use_modular_headers! to Podfile');
      } else {
        console.warn('Could not find target declaration in Podfile');
      }

      return config;
    },
  ]);
};

module.exports = withFirebaseModularHeaders;
