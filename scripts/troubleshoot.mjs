#!/usr/bin/env node
/**
 * Simple project doctor for Expo RN apps.
 * Run with: npm run troubleshoot
 *
 * Checks:
 *  - Node & npm versions
 *  - Expo CLI
 *  - Java (JDK 21)
 *  - Android SDK / adb
 *  - Xcode CLI tools & simctl (macOS)
 *  - CocoaPods (macOS)
 *  - Watchman (macOS)
 *  - Maestro
 *  - Self-hosted GitHub Actions runner
 *  - Expo peer dependency alignment (react, react-native, react-dom)
 *  - Expo doctor
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

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
  // - openjdk version "21.0.10"
  // - openjdk 21.0.10 2026-01-20
  // - java version "21.0.2"
  const j = cmd('java', '-version');
  if (!j.ok) {
    warn('Java not detected. Install OpenJDK 21.');
  } else {
    const jtxt = j.out.toLowerCase();
    const is21 =
      /\bversion\s+"?21\./.test(jtxt) ||
      /\bopenjdk\b.*\b21\./.test(jtxt) ||
      /\bjava\b.*\b21\./.test(jtxt);
    if (!is21) {
      warn(
        `Java detected but not v21. Recommend JDK 21 for RN 0.81. Detected: ${j.out.split('\n')[0]}`,
      );
    } else {
      ok(`Java looks good (21.x). Detected: ${j.out.split('\n')[0]}`);
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

  // Self-hosted GitHub Actions runner (optional)
  header('Self-hosted GitHub Actions Runner (optional)');
  try {
    const RUNNER_DIR = path.join(os.homedir(), '.github', 'actions-runner');

    const hasRunnerDir = fs.existsSync(RUNNER_DIR);
    if (!hasRunnerDir) {
      warn('No local runner found (expected at ~/.github/actions-runner).');
      console.log('   ➜ To set one up: .github/runner/register-runner.sh');
      console.log('   ➜ Then start it: .github/runner/runner.local.sh');
      console.log('     or as a service: .github/runner/runner.service.sh start');
    } else {
      const hasRun = fs.existsSync(path.join(RUNNER_DIR, 'run.sh'));
      const hasConfig = fs.existsSync(path.join(RUNNER_DIR, 'config.sh'));
      const isConfigured =
        fs.existsSync(path.join(RUNNER_DIR, '.runner')) ||
        fs.existsSync(path.join(RUNNER_DIR, '.credentials'));

      if (hasRun && hasConfig) {
        ok('Runner binaries present.');
      } else {
        warn('Runner folder exists but binaries are incomplete. Re-run registration script.');
      }

      if (isConfigured) {
        ok('Runner appears configured.');
      } else {
        warn('Runner not configured yet. Run: .github/runner/register-runner.sh');
      }

      // On macOS, check if a listener is currently running (best-effort)
      if (process.platform === 'darwin') {
        try {
          const p = execSync("pgrep -fl 'Runner.Listener' || true", {
            stdio: ['ignore', 'pipe', 'pipe'],
          })
            .toString()
            .trim();
          if (p) {
            ok('Runner process seems to be running.');
          } else {
            warn('Runner process not running.');
            console.log(
              '   ➜ Start it with: .github/runner/runner.service.sh start or .github/runner/runner.local.sh',
            );
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (e) {
    warn(`Runner check skipped: ${e.message}`);
  }

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

  // Database schema and migrations check
  header('Database Schema & Migrations');
  try {
    const sqliteSchemaPath = path.join(process.cwd(), 'src/db/sqlite/schema.ts');
    const postgresSchemaPath = path.join(process.cwd(), 'src/db/postgres/schema.ts');
    const sqliteMigrationsDir = path.join(process.cwd(), 'src/db/sqlite/migrations');
    const postgresMigrationsDir = path.join(process.cwd(), 'supabase/migrations');

    // Check if schema files exist
    const hasSqliteSchema = fs.existsSync(sqliteSchemaPath);
    const hasPostgresSchema = fs.existsSync(postgresSchemaPath);

    if (!hasSqliteSchema || !hasPostgresSchema) {
      warn('Schema files not found. This is unexpected.');
    } else {
      ok('Schema files found');

      // Get schema file modification times
      const sqliteSchemaMtime = fs.statSync(sqliteSchemaPath).mtime;
      const postgresSchemaMtime = fs.statSync(postgresSchemaPath).mtime;

      // Check SQLite migrations
      const sqliteMigrations = fs.existsSync(sqliteMigrationsDir)
        ? fs
            .readdirSync(sqliteMigrationsDir)
            .filter((f) => f.endsWith('.sql'))
            .map((f) => path.join(sqliteMigrationsDir, f))
        : [];

      // Check Postgres migrations
      const postgresMigrations = fs.existsSync(postgresMigrationsDir)
        ? fs
            .readdirSync(postgresMigrationsDir)
            .filter((f) => f.endsWith('.sql') && !f.includes('example'))
            .map((f) => path.join(postgresMigrationsDir, f))
        : [];

      if (sqliteMigrations.length === 0) {
        err('No SQLite migrations found! Run: npm run db:migrate');
      } else {
        ok(`Found ${sqliteMigrations.length} SQLite migration(s)`);

        // Check if schema is newer than latest migration
        const latestSqliteMigration = sqliteMigrations
          .map((f) => ({ path: f, mtime: fs.statSync(f).mtime }))
          .sort((a, b) => b.mtime - a.mtime)[0];

        if (sqliteSchemaMtime > latestSqliteMigration.mtime) {
          warn('⚠️  SQLite schema.ts is newer than migrations! Run: npm run db:migrate');
          console.log(`   Schema modified: ${sqliteSchemaMtime.toLocaleString()}`);
          console.log(`   Latest migration: ${latestSqliteMigration.mtime.toLocaleString()}`);
        } else {
          ok('SQLite migrations appear up-to-date');
        }
      }

      if (postgresMigrations.length === 0) {
        err('No Postgres migrations found! Run: npm run db:migrate');
      } else {
        ok(`Found ${postgresMigrations.length} Postgres migration(s)`);

        // Check if schema is newer than latest migration
        const latestPostgresMigration = postgresMigrations
          .map((f) => ({ path: f, mtime: fs.statSync(f).mtime }))
          .sort((a, b) => b.mtime - a.mtime)[0];

        if (postgresSchemaMtime > latestPostgresMigration.mtime) {
          warn('⚠️  Postgres schema.ts is newer than migrations! Run: npm run db:migrate');
          console.log(`   Schema modified: ${postgresSchemaMtime.toLocaleString()}`);
          console.log(`   Latest migration: ${latestPostgresMigration.mtime.toLocaleString()}`);
        } else {
          ok('Postgres migrations appear up-to-date');
        }
      }
    }
  } catch (e) {
    warn(`Database check failed: ${e.message}`);
  }

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
