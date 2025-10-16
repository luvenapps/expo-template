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
 *  7) Rename _prettierrc.json → .prettierrc.json if present
 *  8) Rename _prettierignore → .prettierignore if present
 *  9) Rename _nvmrc → .nvmrc if present
 *  10) Enable Husky hooks *without* using deprecated `husky install` (set hooksPath + chmod +x)
 *  11) Materialize .maestro from _maestro if needed
 *  12) Restore .github (delete existing .github and rename _github → .github
 *  13) Ensure all shell scripts in .github are executable
 *  14) Run Prettier to format updated files
 *  15) Remove postinstall from package.json
 *  16) Self-delete this script
 *  17) Print a friendly summary
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

// Simple recursive directory copy (used for _husky → .husky and _maestro → .maestro)
const copyDir = (src, dst) => {
  if (!exists(src)) return;
  if (!exists(dst)) fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dst, entry);
    const stat = fs.lstatSync(s);
    if (stat.isDirectory()) copyDir(s, d);
    else if (stat.isFile()) fs.copyFileSync(s, d);
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
  const owner = 'luvenapps';
  const bundleIdBase = `com.${owner}`;

  // Slug for Expo (keep dashes for readability in slug/name)
  const rawName = (pkg.name || folderName).trim().toLowerCase();
  const slugSafe = rawName
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Android/iOS bundle id segment: letters/digits only, no dashes/underscores; must start with a letter
  const idSegmentBase = rawName.replace(/[^a-z0-9]+/g, '');
  const idSegment = /^[a-z]/.test(idSegmentBase) && idSegmentBase.length
    ? idSegmentBase
    : `app${idSegmentBase}`; // ensure it starts with a letter

  const appId = `${bundleIdBase}.${idSegment}`.replace(/\.+/g, '.');

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
      // URL scheme should follow the appId (deep links like app://)
      expo.scheme =
        typeof expo.scheme === 'string'
          ? expo.scheme.replace(/__APP_NAME__/g, idSegmentBase)
          : appId;

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

      // Android intentFilters: populate/replace scheme tokens (e.g., { data: [{ scheme: "__APP_NAME__" }] })
      try {
        const filters = (expo.android.intentFilters ||= []);
        for (const f of filters) {
          // Normalize single object to array if needed
          if (f && f.data && !Array.isArray(f.data)) f.data = [f.data];
          if (Array.isArray(f?.data)) {
            for (const d of f.data) {
              if (!d || typeof d !== 'object') continue;
              if (typeof d.scheme === 'string') {
                // Replace placeholder with a safe scheme value
                d.scheme = d.scheme.replace(/__APP_NAME__/g, idSegmentBase);
              } else if (d.scheme == null) {
                // Default missing scheme to a safe value
                d.scheme = idSegmentBase;
              }
            }
          }
        }
      } catch {}

      if (appJson.expo) appJson.expo = expo;
      else Object.assign(appJson, expo);
      writeJson(appJsonPath, appJson);
      console.log('✅ app.json updated (name, slug, bundle IDs)');
    } catch (e) {
      console.log(`⚠️  app.json update skipped (${e.message})`);
    }
  }

  // 4) Maestro flows (update in .maestro or _maestro if present)
  const flowRoots = [
    path.join(CWD, '.maestro', 'flows'),
    path.join(CWD, '_maestro', 'flows'),
  ];

  let touchedTotal = 0;
  for (const flowsDir of flowRoots) {
    if (!exists(flowsDir)) continue;

    for (const f of fs.readdirSync(flowsDir)) {
      if (!/\.(ya?ml)$/.test(f)) continue;
      const p = path.join(flowsDir, f);
      const before = fs.readFileSync(p, 'utf8');
      const after = before
        .replace(/__APP_ID__/g, summary.appId)
        .replace(/__APP_NAME__/g, summary.appName);
      if (after !== before) {
        fs.writeFileSync(p, after, 'utf8');
        touchedTotal++;
      }
    }
  }
  console.log(`✅ Maestro flows updated (${touchedTotal} file(s))`);

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

  // 6) Restore .gitignore (delete existing .gitignore and rename _gitignore → .gitignore)
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

  // 7) Rename _prettierrc.json → .prettierrc.json if present
  const prettierrcSrc = path.join(CWD, '_prettierrc.json');
  const prettierrcDst = path.join(CWD, '.prettierrc.json');
  if (exists(prettierrcSrc)) {
    try {
      if (exists(prettierrcDst)) {
        fs.unlinkSync(prettierrcDst);
        console.log('🧹 Removed existing .prettierrc.json to replace with template version');
      }
      fs.renameSync(prettierrcSrc, prettierrcDst);
      console.log('✅ Restored .prettierrc.json from template');
    } catch (e) {
      console.log(`⚠️  Failed to restore .prettierrc.json (${e.message})`);
    }
  } else {
    console.log('⚠️  No _prettierrc.json found in template directory — skipping');
  }

  // 8) Rename _prettierignore → .prettierignore if present
  const prettierignoreSrc = path.join(CWD, '_prettierignore');
  const prettierignoreDst = path.join(CWD, '.prettierignore');
  if (exists(prettierignoreSrc)) {
    try {
      if (exists(prettierignoreDst)) {
        fs.unlinkSync(prettierignoreDst);
        console.log('🧹 Removed existing .prettierignore to replace with template version');
      }
      fs.renameSync(prettierignoreSrc, prettierignoreDst);
      console.log('✅ Restored .prettierignore from template');
    } catch (e) {
      console.log(`⚠️  Failed to restore .prettierignore (${e.message})`);
    }
  } else {
    console.log('⚠️  No _prettierignore found in template directory — skipping');
  }

  // 9) Rename _nvmrc → .nvmrc if present
  const nvmrcSrc = path.join(CWD, '_nvmrc');
  const nvmrcDst = path.join(CWD, '.nvmrc');
  if (exists(nvmrcSrc)) {
    try {
      if (exists(nvmrcDst)) {
        fs.unlinkSync(nvmrcDst);
        console.log('🧹 Removed existing .nvmrc to replace with template version');
      }
      fs.renameSync(nvmrcSrc, nvmrcDst);
      console.log('✅ Restored .nvmrc from template');
    } catch (e) {
      console.log(`⚠️  Failed to restore .nvmrc (${e.message})`);
    }
  } else {
    console.log('⚠️  No _nvmrc found in template directory — skipping');
  }

  // 10) Husky v9+ (no `husky install`): set hooksPath + chmod, and materialize from _husky if needed
  const isGit = runSilent('git', ['rev-parse', '--is-inside-work-tree']);
  if (!isGit) runSilent('git', ['init']);
  const huskyDst = path.join(CWD, '.husky');
  const huskySrcCandidates = [
    path.join(CWD, '.husky'),  // present for local copies
    path.join(CWD, '_husky'),  // present when installed from GitHub/npm tarball
  ];
  const huskySrc = huskySrcCandidates.find(exists);

  if (huskySrc) {
    try {
      copyDir(huskySrc, huskyDst);
      runSilent('git', ['config', 'core.hooksPath', '.husky']);
      for (const f of fs.readdirSync(huskyDst)) {
        const p = path.join(huskyDst, f);
        if (fs.lstatSync(p).isFile()) {
          try { fs.chmodSync(p, 0o755); } catch {}
        }
      }
      console.log('✅ Husky hooks installed');
      if (huskySrc === path.join(CWD, '_husky')) {
        try {
          fs.rmSync(huskySrc, { recursive: true, force: true });
          console.log('🧹 Removed _husky template folder');
        } catch (e) {
          console.log(`⚠️  Failed to remove _husky folder (${e.message})`);
        }
      }
    } catch (e) {
      console.log(`⚠️  Husky setup failed (${e.message})`);
    }
  } else {
    console.log('⚠️  No .husky/_husky found in template directory — skipping');
  }

  // 11) Materialize Maestro folder (.maestro) from _maestro if needed
  const maestroDst = path.join(CWD, '.maestro');
  const maestroSrcCandidates = [
    path.join(CWD, '.maestro'),
    path.join(CWD, '_maestro'),
  ];
  const maestroSrc = maestroSrcCandidates.find(exists);

  if (maestroSrc) {
    try {
      copyDir(maestroSrc, maestroDst);
      console.log('✅ Maestro folder restored from template');
      if (maestroSrc === path.join(CWD, '_maestro')) {
        try {
          fs.rmSync(maestroSrc, { recursive: true, force: true });
          console.log('🧹 Removed _maestro template folder');
        } catch (e) {
          console.log(`⚠️  Failed to remove _maestro folder (${e.message})`);
        }
      }
    } catch (e) {
      console.log(`⚠️  Maestro restore failed (${e.message})`);
    }
  } else {
    console.log('⚠️  No .maestro/_maestro found in template directory — skipping');
  }

  // 12) Restore .github (delete existing .github and rename _github → .github)
  const githubDst = path.join(CWD, '.github');
  const githubSrcCandidates = [
    path.join(CWD, '.github'),
    path.join(CWD, '_github'),
  ];
  const githubSrc = githubSrcCandidates.find(exists);

  if (githubSrc) {
    try {
      copyDir(githubSrc, githubDst);
      console.log('✅ github folder restored from template');
      if (githubSrc === path.join(CWD, '_github')) {
        try {
          fs.rmSync(githubSrc, { recursive: true, force: true });
          console.log('🧹 Removed _github template folder');
        } catch (e) {
          console.log(`⚠️  Failed to remove _github folder (${e.message})`);
        }
      }
    } catch (e) {
      console.log(`⚠️  github restore failed (${e.message})`);
    }
  } else {
    console.log('⚠️  No .github/_maestro found in template directory — skipping');
  }

  // 13) Ensure all shell scripts in .github are executable
  const githubDir = path.join(CWD, '.github');
  if (exists(githubDir)) {
    try {
      const makeExecutable = (dir) => {
        for (const file of fs.readdirSync(dir)) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            makeExecutable(fullPath);
          } else if (stat.isFile() && fullPath.endsWith('.sh')) {
            try {
              fs.chmodSync(fullPath, 0o755);
            } catch (e) {
              console.log(`⚠️  Failed to chmod ${fullPath}: ${e.message}`);
            }
          }
        }
      };
      makeExecutable(githubDir);
      console.log('✅ All .sh scripts in .github are executable');
    } catch (e) {
      console.log(`⚠️  Failed to make .github scripts executable (${e.message})`);
    }
  }

  // 14) Run Prettier to format updated files (single-line status)
  try {
    process.stdout.write('🧩 Formatting with Prettier...');
    cp.execSync('npx prettier --write .', { stdio: 'ignore' });
    process.stdout.write(' ✅ Done!\n');
  } catch (err) {
    console.log(`\n⚠️  Prettier formatting skipped or failed: ${err.message}`);
  }
  
  // 15) Remove postinstall from package.json
  try {
    if (
      pkg.scripts &&
      pkg.scripts.postinstall &&
      typeof pkg.scripts.postinstall === 'string' &&
      pkg.scripts.postinstall.includes('scripts/postinstall.js')
    ) {
      delete pkg.scripts.postinstall;
      writeJson(pkgPath, pkg);
      console.log('🧹 Removed postinstall script from package.json');
    }
  } catch (e) {
    console.log(`⚠️  Failed to remove postinstall script from package.json (${e.message})`);
  }

  // 16) Self-delete
  const self = path.join(CWD, 'scripts', 'postinstall.js');
  try {
    process.on('exit', () => {
      try {
        if (exists(self)) fs.unlinkSync(self);
      } catch {}
      console.log('🧹 Removed scripts/postinstall.js');
    });
  } catch {}

  // 17) Summary
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
