#!/usr/bin/env node
/**
 * Simple project doctor for Expo RN apps.
 * Run with: npm run troubleshoot
 *
 * Checks:
 *  - Node & npm versions
 *  - Expo CLI
 *  - Java (JDK 17)
 *  - Android SDK / adb
 *  - Xcode CLI tools & simctl (macOS)
 *  - CocoaPods (macOS)
 *  - Watchman (macOS)
 *  - Maestro
 *  - Expo peer dependency alignment (react, react-native, react-dom)
 *  - Expo doctor
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function header(title) {
  console.log('\n' + '─'.repeat(70));
  console.log(`🔎 ${title}`);
  console.log('─'.repeat(70));
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}
function warn(msg) {
  console.log(`⚠️  ${msg}`);
}
function err(msg) {
  console.log(`❌ ${msg}`);
}

// capture BOTH stdout and stderr (java -version prints to stderr)
function cmd(bin, args = '--version') {
  try {
    const out = execSync(`${bin} ${args} 2>&1`, { stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .trim();
    ok(`${bin} ${args} -> ${out.split('\n')[0]}`);
    return { ok: true, out };
  } catch (e) {
    warn(`${bin} not found or failed: ${e.message}`);
    return { ok: false, out: '' };
  }
}

function getPackageJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function getInstalledPkgVersion(name) {
  try {
    const p = require.resolve(`${name}/package.json`, { paths: [process.cwd()] });
    const pj = require(p);
    return pj.version;
  } catch {
    return null;
  }
}

function compareVersions(actual, expected) {
  if (!actual || !expected) return false;
  const clean = (v) => String(v).replace(/^[~^]/, '');
  return clean(actual) === clean(expected);
}

(function main() {
  header('Environment');

  // Node & npm
  ok(`node -> ${process.version}`);
  cmd('npm', '-v');

  // Expo CLI
  cmd('npx', 'expo --version');

  // Java (JDK) - accept formats like:
  // - openjdk version "17.0.16"
  // - openjdk 17.0.16 2025-07-15
  // - java version "17.0.12"
  const j = cmd('java', '-version');
  if (!j.ok) {
    warn('Java not detected. Install OpenJDK 17.');
  } else {
    const jtxt = j.out.toLowerCase();
    const is17 =
      /\bversion\s+"?17\./.test(jtxt) ||
      /\bopenjdk\b.*\b17\./.test(jtxt) ||
      /\bjava\b.*\b17\./.test(jtxt);
    if (!is17) {
      warn(
        `Java detected but not v17. Recommend JDK 17 for RN 0.81. Detected: ${j.out.split('\n')[0]}`,
      );
    } else {
      ok(`Java looks good (17.x). Detected: ${j.out.split('\n')[0]}`);
    }
  }

  // Android SDK & adb
  const adb = cmd('adb', 'version');
  if (!adb.ok) {
    warn(
      'adb not detected. Ensure Android Platform Tools are installed and ANDROID_HOME/SDK is on PATH.',
    );
  } else {
    const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
    if (sdk) ok(`Android SDK path -> ${sdk}`);
    else warn('ANDROID_HOME / ANDROID_SDK_ROOT not set.');
  }

  // macOS specific tools
  if (process.platform === 'darwin') {
    cmd('xcodebuild', '-version');
    cmd('xcrun', 'simctl list devices');
    cmd('pod', '--version');
    cmd('watchman', '--version');
  }

  // Maestro
  cmd('maestro', '--version');

  // Expo peer deps
  header('Expo peer dependency alignment');
  const appPkg = getPackageJson(path.join(process.cwd(), 'package.json'));
  const expoPkgPath = (() => {
    try {
      return require.resolve('expo/package.json', { paths: [process.cwd()] });
    } catch {
      return null;
    }
  })();
  if (!expoPkgPath) {
    err('expo is not installed in node_modules. Run: npx expo install expo');
  } else {
    const expoPkg = require(expoPkgPath);
    const peers = expoPkg.peerDependencies || {};
    const expected = {
      react: peers.react || appPkg?.dependencies?.react,
      'react-native': peers['react-native'] || appPkg?.dependencies?.['react-native'],
      'react-dom': peers['react-dom'] || appPkg?.dependencies?.['react-dom'],
    };
    for (const dep of Object.keys(expected)) {
      if (!expected[dep]) continue;
      const installed =
        getInstalledPkgVersion(dep) ||
        appPkg?.dependencies?.[dep] ||
        appPkg?.devDependencies?.[dep];
      if (!installed) {
        warn(`${dep} is not installed. Expected ~ ${expected[dep]}`);
        continue;
      }
      // If Expo's expected version is "*", treat it as always compatible
      if (expected[dep] === '*' || expected[dep] === undefined) {
        ok(`${dep} -> ${installed} (Expo accepts any version)`);
        continue;
      }

      const matches =
        compareVersions(installed, expected[dep]) ||
        String(installed).startsWith(String(expected[dep]).replace(/^[~^]/, ''));

      if (matches) {
        ok(`${dep} -> ${installed} (compatible with expected ${expected[dep]})`);
      } else {
        warn(
          `${dep} -> ${installed} (expected ${expected[dep]}). Run: npx expo install ${dep}@${expected[dep]}`,
        );
      }
    }
  }

  const { spawnSync } = require('child_process');

  header('Expo Doctor');
  try {
    const result = spawnSync('npx', ['expo-doctor', '--verbose'], { stdio: 'inherit' });
    if (result.error) throw result.error;
  } catch (e) {
    warn('Expo Doctor failed to run. Try manually with: npx expo-doctor --verbose', e);
  }

  header('Conclusion');
  console.log('If any ❌/⚠️ were shown above, address them and re-run `npm run troubleshoot`.\n');
})();
