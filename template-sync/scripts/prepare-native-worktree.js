const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

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

function discoverPrimaryCheckout(projectRoot, runGit = execFileSync) {
  let output;

  try {
    output = runGit('git', ['-C', projectRoot, 'worktree', 'list', '--porcelain', '-z'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    throw new Error(
      'Could not find the primary Git checkout. Run this command inside a Git worktree.',
    );
  }

  const primaryWorktree = output.split('\0').find((entry) => entry.startsWith('worktree '));

  if (!primaryWorktree) {
    throw new Error(
      'Git did not report a primary checkout. Verify this repository’s worktree setup.',
    );
  }

  return primaryWorktree.slice('worktree '.length);
}

function copyFileIfMissing(sourcePath, destinationPath, fileSystem = fs) {
  if (fileSystem.existsSync(destinationPath) || !fileSystem.existsSync(sourcePath)) {
    return false;
  }

  fileSystem.mkdirSync(path.dirname(destinationPath), { recursive: true });

  try {
    fileSystem.copyFileSync(sourcePath, destinationPath, fileSystem.constants.COPYFILE_EXCL);
    return true;
  } catch (error) {
    if (error.code === 'EEXIST') {
      return false;
    }

    throw error;
  }
}

function readExpoEnvironment(projectRoot, shellEnvironment = process.env, parseProjectEnv) {
  const parseEnvironment = parseProjectEnv || require('@expo/env').parseProjectEnv;
  const { env = {} } = parseEnvironment(projectRoot, {
    mode: 'development',
    silent: true,
    systemEnv: shellEnvironment,
  });

  return { ...env, ...shellEnvironment };
}

function requireSupabaseEnvironment(environment) {
  const missing = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'].filter(
    (key) => !environment[key],
  );

  if (missing.length) {
    throw new Error(
      `Supabase configuration is missing: ${missing.join(', ')}. Add these values to .env.local in the primary checkout or configure them in this shell.`,
    );
  }
}

function prepareWorktree({
  projectRoot = process.cwd(),
  platform,
  shellEnvironment = process.env,
  runGit = execFileSync,
  fileSystem = fs,
  parseProjectEnv,
}) {
  if (!['start', 'ios', 'android'].includes(platform)) {
    throw new Error('Specify one of the supported commands: start, ios, or android.');
  }

  const primaryCheckout = discoverPrimaryCheckout(projectRoot, runGit);
  const copiedEnv = copyFileIfMissing(
    path.join(primaryCheckout, '.env.local'),
    path.join(projectRoot, '.env.local'),
    fileSystem,
  );
  const environment = readExpoEnvironment(projectRoot, shellEnvironment, parseProjectEnv);

  requireSupabaseEnvironment(environment);

  const credentialPlatforms = platform === 'start' ? Object.keys(PLATFORM_CREDENTIALS) : [platform];
  const copiedCredentials = [];

  for (const credentialPlatform of credentialPlatforms) {
    const credential = PLATFORM_CREDENTIALS[credentialPlatform];
    const sourcePath = path.join(primaryCheckout, credential.file);
    const destinationPath = path.join(projectRoot, credential.file);
    if (copyFileIfMissing(sourcePath, destinationPath, fileSystem)) {
      copiedCredentials.push(credentialPlatform);
    }

    if (
      platform !== 'start' &&
      !fileSystem.existsSync(destinationPath) &&
      !environment[credential.environmentVariable]
    ) {
      throw new Error(
        `Firebase credentials are missing for ${credentialPlatform}. Add ${credential.file} to the primary checkout or configure ${credential.environmentVariable}.`,
      );
    }
  }

  return { primaryCheckout, copiedEnv, copiedCredentials };
}

function main(args = process.argv.slice(2), dependencies = {}) {
  const platform = args[0];
  const result = prepareWorktree({ ...dependencies, platform });
  const log = dependencies.log || console.log;

  if (result.copiedEnv) {
    log('Prepared .env.local from the primary checkout.');
  }

  for (const credentialPlatform of result.copiedCredentials) {
    log(`Prepared Firebase credentials for ${credentialPlatform} from the primary checkout.`);
  }

  return result;
}

function runCli(args = process.argv.slice(2), dependencies = {}) {
  try {
    main(args, dependencies);
    return 0;
  } catch (error) {
    const logError = dependencies.logError || console.error;
    logError(error.message);
    return 1;
  }
}

/* istanbul ignore next: npm invokes this file directly through lifecycle hooks. */
if (require.main === module) {
  process.exitCode = runCli();
}

module.exports = {
  copyFileIfMissing,
  discoverPrimaryCheckout,
  main,
  PLATFORM_CREDENTIALS,
  prepareWorktree,
  readExpoEnvironment,
  requireSupabaseEnvironment,
  runCli,
};
