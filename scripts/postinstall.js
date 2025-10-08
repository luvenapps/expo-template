#!/usr/bin/env node
/**
 * Postinstall bootstrap for Expo template
 *
 * Runs in the *generated app* right after `npm install` completes.
 * It will:
 * 1) Detect new project name from folder name (or keep existing `package.json#name`)
 * 2) Update package.json "name"
 * 3) Ensure "prepare": "husky" is present in scripts
 * 4) Update app.json placeholders: __APP_NAME__, __APP_SLUG__, __APP_ID__
 * 5) Replace Maestro placeholders (__APP_ID__, __APP_NAME__, __APP_SLUG__) in .maestro/flows/*
 * 6) Replace README tokens if present
 * 7) Try to run `npx husky install` (best-effort)
 * 8) Remove itself from package.json scripts and delete scripts/postinstall.js
 * 9) Remove `x-template` block and clean empty `scripts`
 *
 * Notes:
 * - The template repo SHOULD NOT have a "prepare" script to allow `npm pack`.
 * - This script will add "prepare": "husky" to the *generated app* instead.
 * - Uses `package.json["x-template"]` for config:
 *     - bundleIdBase (default: "com.example")
 *     - templateName (default: current package name or "template-starter")
 */

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const ROOT = process.cwd();
const pkgPath = path.join(ROOT, 'package.json');
const appJsonPath = path.join(ROOT, 'app.json');
const maestroDir = path.join(ROOT, '.maestro', 'flows');
const readmePath = path.join(ROOT, 'README.md');
const thisScriptPath = path.join(ROOT, 'scripts', 'postinstall.js');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function writeJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}
function toSlug(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function toIdSuffix(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}
function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return false;
  let src = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (typeof from === 'string' && src.includes(from)) {
      src = src.split(from).join(to);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(filePath, src, 'utf8');
  return changed;
}

try {
  if (!fs.existsSync(pkgPath)) {
    console.warn('⚠️ package.json not found; aborting postinstall.');
    process.exit(0);
  }

  const pkgBefore = readJSON(pkgPath);
  const cfg = pkgBefore['x-template'] || {};
  const bundleIdBase = cfg.bundleIdBase || 'com.example';
  const templateName = cfg.templateName || pkgBefore.name || 'template-starter';

  // Derive new project name from folder name unless user already changed it
  const folderName = path.basename(ROOT);
  const newName = pkgBefore.name && pkgBefore.name !== templateName ? pkgBefore.name : folderName;

  // Compute identifiers
  const slug = toSlug(newName);
  const idSuffix = toIdSuffix(newName);
  const appId = `${bundleIdBase}.${idSuffix}`;

  // 1) Update package.json name
  const pkgAfter = { ...pkgBefore, name: newName };
  pkgAfter.scripts = pkgAfter.scripts || {};

  // 2) Ensure "prepare": "husky" exists in scripts (for the generated app only)
  pkgAfter.scripts.prepare = 'husky';

  // 3) Remove postinstall (avoid re-running)
  if (pkgAfter.scripts.postinstall) {
    delete pkgAfter.scripts.postinstall;
  }

  // 9a) Remove x-template metadata
  if (pkgAfter['x-template']) {
    delete pkgAfter['x-template'];
    console.log('🧹 Removed x-template metadata from package.json');
  }

  // 9b) If scripts became empty, remove the whole section (we'll re-add if needed)
  if (pkgAfter.scripts && Object.keys(pkgAfter.scripts).length === 0) {
    delete pkgAfter.scripts;
    console.log('🧹 Removed empty "scripts" section from package.json');
  }

  writeJSON(pkgPath, pkgAfter);
  console.log(`✅ package.json updated: name="${newName}", ensured scripts.prepare="husky"`);

  // 4) Update app.json placeholders
  if (fs.existsSync(appJsonPath)) {
    try {
      const appJson = readJSON(appJsonPath);
      appJson.expo = appJson.expo || {};

      if (typeof appJson.expo.name === 'string') {
        appJson.expo.name = appJson.expo.name.replace(/__APP_NAME__/g, newName);
      } else {
        appJson.expo.name = newName;
      }

      const currentSlug = appJson.expo.slug || '__APP_SLUG__';
      appJson.expo.slug = String(currentSlug).replace(/__APP_SLUG__/g, slug);

      appJson.expo.ios = appJson.expo.ios || {};
      appJson.expo.android = appJson.expo.android || {};

      const iosId = appJson.expo.ios.bundleIdentifier || '__APP_ID__';
      const androidId = appJson.expo.android.package || '__APP_ID__';
      appJson.expo.ios.bundleIdentifier = String(iosId).replace(/__APP_ID__/g, appId);
      appJson.expo.android.package = String(androidId).replace(/__APP_ID__/g, appId);

      writeJSON(appJsonPath, appJson);
      console.log(`✅ app.json updated (name, slug, bundle IDs)`);
    } catch (e) {
      console.warn('⚠️ Could not update app.json:', e.message);
    }
  } else {
    console.warn('⚠️ app.json not found; skipping.');
  }

  // 5) Maestro placeholders
  if (fs.existsSync(maestroDir)) {
    const files = fs.readdirSync(maestroDir).filter((f) => /\.(ya?ml)$/i.test(f));
    let changed = 0;
    for (const f of files) {
      const p = path.join(maestroDir, f);
      if (
        replaceInFile(p, [
          ['__APP_ID__', appId],
          ['__APP_NAME__', newName],
          ['__APP_SLUG__', slug],
        ])
      )
        changed++;
    }
    console.log(`✅ Maestro flows updated (${changed} file(s))`);
  }

  // 6) README token replacements (optional)
  if (fs.existsSync(readmePath)) {
    const changed = replaceInFile(readmePath, [
      ['__APP_NAME__', newName],
      ['__APP_SLUG__', slug],
      ['__APP_ID__', appId],
    ]);
    if (changed) console.log('✅ README tokens replaced.');
  }

  // 7) Best-effort Husky install (works if husky is in devDeps)
  try {
    const hasHuskyBin = fs.existsSync(path.join(ROOT, 'node_modules', '.bin', 'husky'));
    if (hasHuskyBin) {
      child_process.execSync('npx husky install', { stdio: 'inherit' });
      console.log('✅ Husky hooks installed');
    } else {
      console.log('ℹ️ Husky not found in devDependencies. Skipping hooks install.');
    }
  } catch (e) {
    console.log('ℹ️ Skipped Husky setup:', e.message);
  }

  // 8) Restore .gitignore (npm strips it by default)
  try {
    const gitignoreSrc = path.join(__dirname, 'gitignore'); // comes from the template repo
    const gitignoreDest = path.join(process.cwd(), '.gitignore'); // new app root

    if (fs.existsSync(gitignoreSrc)) {
      if (!fs.existsSync(gitignoreDest)) {
        fs.copyFileSync(gitignoreSrc, gitignoreDest);
        console.log('✅ Restored .gitignore');
      } else {
        console.log('ℹ️  .gitignore already exists — skipping restore');
      }
    } else {
      console.warn('⚠️  No gitignore found in template directory — skipping');
    }
  } catch (err) {
    console.error('❌ Failed to restore .gitignore:', err);
  }

  // 9) Delete this script and its (now empty) dir
  try {
    if (fs.existsSync(thisScriptPath)) {
      fs.unlinkSync(thisScriptPath);
      const dir = path.dirname(thisScriptPath);
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
      console.log('🧹 Removed scripts/postinstall.js');
    }
  } catch (_) {}

  // ✅ Final summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ App bootstrap complete');
  console.log(`📦 Name: ${newName}`);
  console.log(`🔖 Slug: ${slug}`);
  console.log(`🏷️  App ID: ${appId}`);
  console.log('='.repeat(60) + '\n');
} catch (err) {
  console.error('❌ Postinstall failed:', err && err.message ? err.message : err);
  // Do not fail install
  process.exit(0);
}
