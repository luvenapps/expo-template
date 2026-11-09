const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');

const PLATFORM_CREDENTIALS = {
  ios: {
    file: path.join('credentials', 'GoogleService-Info.plist'),
    environmentVariable: 'GOOGLE_SERVICE_INFO_PLIST_B64',
  },
  android: {
    file: path.join('credentials', 'google-services.json'),
    environmentVariable: 'GOOGLE_SERVICES_JSON_B64',
  },
};

function isActualBuild(args = process.argv, environment = process.env) {
  const buildCommands = ['prebuild', 'run:ios', 'run:android'];
  const platform = detectPlatform(args, environment);
  const nativePlatforms = ['ios', 'android'];

  return (
    args.some((arg) => buildCommands.some((command) => arg.includes(command))) ||
    nativePlatforms.includes(environment.EAS_BUILD_PLATFORM?.toLowerCase()) ||
    (Boolean(environment.EXPO_TOKEN) && nativePlatforms.includes(platform))
  );
}

function detectPlatform(args = process.argv, environment = process.env) {
  const easPlatform = environment.EAS_BUILD_PLATFORM?.toLowerCase();
  if (easPlatform) {
    return easPlatform;
  }

  if (args.includes('run:ios')) {
    return 'ios';
  }

  if (args.includes('run:android')) {
    return 'android';
  }

  const platformArgIndex = args.indexOf('--platform');
  if (platformArgIndex === -1) {
    return null;
  }

  const platform = args[platformArgIndex + 1]?.toLowerCase();

  return platform || null;
}

function writeCredentialIfMissing(credentialPath, base64Content, fileSystem = fs) {
  try {
    fileSystem.writeFileSync(credentialPath, Buffer.from(base64Content, 'base64'), { flag: 'wx' });
    return true;
  } catch (error) {
    if (error.code === 'EEXIST') {
      return false;
    }

    throw error;
  }
}

function generateCredentials(projectRoot, platform = detectPlatform(), environment = process.env) {
  if (platform === 'web') {
    return;
  }

  const platforms = platform ? [platform] : Object.keys(PLATFORM_CREDENTIALS);
  const credentialsDirectory = path.join(projectRoot, 'credentials');

  for (const targetPlatform of platforms) {
    const credential = PLATFORM_CREDENTIALS[targetPlatform];

    if (!credential) {
      throw new Error(`Unsupported Firebase credential platform: ${targetPlatform}`);
    }

    const credentialPath = path.join(projectRoot, credential.file);

    if (fs.existsSync(credentialPath)) {
      continue;
    }

    const base64Content = environment[credential.environmentVariable];

    if (!base64Content) {
      throw new Error(
        `Firebase credentials are missing for ${targetPlatform}. Add ${credential.file} to the primary checkout or configure ${credential.environmentVariable}.`,
      );
    }

    fs.mkdirSync(credentialsDirectory, { recursive: true });
    writeCredentialIfMissing(credentialPath, base64Content);
  }
}

function withFirebaseCredentials(config) {
  if (!isActualBuild()) {
    return config;
  }

  generateCredentials(process.cwd(), detectPlatform());
  return config;
}

module.exports = withFirebaseCredentials;
module.exports.detectPlatform = detectPlatform;
module.exports.generateCredentials = generateCredentials;
module.exports.isActualBuild = isActualBuild;
module.exports.writeCredentialIfMissing = writeCredentialIfMissing;
