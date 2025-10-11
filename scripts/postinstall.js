/**
 * Template Postinstall Script
 * ---------------------------
 * This script runs once after dependencies are installed when creating a new app from the template.
 *
 * Responsibilities (minimal + working Husky v9+):
 *  1) Update package.json name (if still "template-starter")
 *  2) Remove template-only metadata ("x-template") from package.json
 *  3) Replace placeholders (__APP_NAME__, __APP_ID__) in app.json
 *  4) Replace placeholders in Maestro flows (.maestro/flows/*.yml|yaml)
 *  5) Replace tokens in README.md (if present)
 *  6) Restore .gitignore from "gitignore" (if present)
 *  7) Enable Husky hooks *without* using deprecated `husky install` (set hooksPath + chmod +x)
 *  8) Run Prettier to format updated files
 *  9) Self-delete this script
 *  10) Print a friendly summary
 *
 * Notes:
 *  - Intentionally does NOT run `npx husky install`. Husky v9+ works with `core.hooksPath` + executable hooks.
 *  - Idempotent: safe to re-run; it won't double-apply changes.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

// Helpers
const CWD = process.cwd();
const exists = (p) => {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
};
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, o) =>
  fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n', 'utf8');
const runSilent = (cmd, args, opts = {}) => {
  try {
    cp.execFileSync(cmd, args, { stdio: 'ignore', ...opts });
    return true;
  } catch {
    return false;
  }
};

// Summary for the footer
let summary = { appName: null, slug: null, appId: null };

(function main() {
  // 1) package.json: update name (keep minimal behavior)
  const pkgPath = path.join(CWD, 'package.json');
  if (!exists(pkgPath)) {
    console.log('⚠️  package.json not found — aborting postinstall');
    return;
  }
  const pkg = readJson(pkgPath);
  const folderName = path.basename(CWD);
  if (!pkg.name || pkg.name === 'template-starter') {
    pkg.name = folderName;
  }
  summary.appName = pkg.name;
  writeJson(pkgPath, pkg);

  // 2) Remove x-template metadata
  if (pkg['x-template']) {
    delete pkg['x-template'];
    writeJson(pkgPath, pkg);
    console.log('🧹 Removed x-template metadata from package.json');
  }
  console.log(`✅ package.json updated: name="${pkg.name}"`);

  // 3) app.json tokens
  const appJsonPath = path.join(CWD, 'app.json');
  const bundleIdBase = 'com.luvenapps';
  const slugSafe = (pkg.name || folderName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const appId = `${bundleIdBase}.${slugSafe}`.replace(/\.\.+/g, '.');
  summary.slug = slugSafe;
  summary.appId = appId;

  if (exists(appJsonPath)) {
    try {
      const appJson = readJson(appJsonPath);
      const expo = appJson.expo || appJson;

      expo.name =
        typeof expo.name === 'string'
          ? expo.name.replace(/__APP_NAME__/g, pkg.name)
          : pkg.name;
      expo.slug =
        typeof expo.slug === 'string'
          ? expo.slug.replace(/__APP_NAME__/g, slugSafe)
          : slugSafe;

      expo.ios = expo.ios || {};
      expo.ios.bundleIdentifier =
        typeof expo.ios.bundleIdentifier === 'string'
          ? expo.ios.bundleIdentifier.replace(/__APP_ID__/g, appId)
          : expo.ios.bundleIdentifier || appId;

      expo.android = expo.android || {};
      expo.android.package =
        typeof expo.android.package === 'string'
          ? expo.android.package.replace(/__APP_ID__/g, appId)
          : expo.android.package || appId;

      if (appJson.expo) appJson.expo = expo;
      else Object.assign(appJson, expo);
      writeJson(appJsonPath, appJson);
      console.log('✅ app.json updated (name, slug, bundle IDs)');
    } catch (e) {
      console.log(`⚠️  app.json update skipped (${e.message})`);
    }
  }

  // 4) Maestro flows
  const flowsDir = path.join(CWD, '.maestro', 'flows');
  if (exists(flowsDir)) {
    let touched = 0;
    for (const f of fs.readdirSync(flowsDir)) {
      if (!/\.(ya?ml)$/.test(f)) continue;
      const p = path.join(flowsDir, f);
      const before = fs.readFileSync(p, 'utf8');
      const after = before
        .replace(/__APP_ID__/g, summary.appId)
        .replace(/__APP_NAME__/g, summary.appName);
      if (after != before) {
        fs.writeFileSync(p, after, 'utf8');
        touched++;
      }
    }
    console.log(`✅ Maestro flows updated (${touched} file(s))`);
  }

  // 5) README tokens
  const readmePath = path.join(CWD, 'README.md');
  if (exists(readmePath)) {
    const before = fs.readFileSync(readmePath, 'utf8');
    const after = before
      .replace(/__APP_NAME__/g, summary.appName)
      .replace(/__APP_ID__/g, summary.appId);
    if (after !== before) {
      fs.writeFileSync(readmePath, after, 'utf8');
      console.log('✅ README tokens replaced.');
    }
  }

  // 6) Restore .gitignore (delete existing .gitignore and rename gitignore → .gitignore)
  const giSrc = path.join(CWD, '_gitignore');
  const giDst = path.join(CWD, '.gitignore');

  if (exists(giSrc)) {
    try {
      if (exists(giDst)) {
        fs.unlinkSync(giDst);
        console.log(
          '🧹 Removed existing .gitignore to replace with template version'
        );
      }
      fs.renameSync(giSrc, giDst);
      console.log('✅ Restored .gitignore from template');
    } catch (e) {
      console.log(`⚠️  Failed to restore .gitignore (${e.message})`);
    }
  } else {
    console.log('⚠️  No gitignore found in template directory — skipping');
  }

  // 7) Husky v9+ (no `husky install`): set hooksPath + chmod
  const isGit = runSilent('git', ['rev-parse', '--is-inside-work-tree']);
  if (!isGit) runSilent('git', ['init']);
  const huskyDir = path.join(CWD, '.husky');
  if (exists(huskyDir)) {
    runSilent('git', ['config', 'core.hooksPath', '.husky']);
    try {
      for (const f of fs.readdirSync(huskyDir)) {
        const p = path.join(huskyDir, f);
        if (fs.lstatSync(p).isFile()) {
          try {
            fs.chmodSync(p, 0o755);
          } catch {}
        }
      }
      console.log('✅ Husky hooks installed');
    } catch {
      console.log('⚠️  Husky chmod failed (hooks may not be executable)');
    }
  }

  // 8) Run Prettier to format updated files
  process.stdout.write('🧩 Formatting with Prettier...');
  try {
    cp.execSync('npx prettier --write .', { stdio: 'ignore' });
    process.stdout.write(' ✅ Done!\n');
  } catch (err) {
    console.log(`\n⚠️  Prettier formatting skipped or failed: ${err.message}`);
  }

  // 9) Self-delete
  const self = path.join(CWD, 'scripts', 'postinstall.js');
  try {
    process.on('exit', () => {
      try {
        if (exists(self)) fs.unlinkSync(self);
      } catch {}
      console.log('🧹 Removed scripts/postinstall.js');
    });
  } catch {}

  // 10) Summary
  const bar = '============================================================';
  console.log(`
${bar}
✅ App bootstrap complete
📦 Name: ${summary.appName}
🔖 Slug: ${summary.slug}
🏷️  App ID: ${summary.appId}
${bar}
`);
})();
