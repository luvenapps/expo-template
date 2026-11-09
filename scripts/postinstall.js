/**
 * Template Postinstall Script
 * ---------------------------
 * This script runs once after dependencies are installed when creating a new app from the template.
 *
 * Responsibilities (minimal + working Husky v9+):
 *  - Update package.json name (if still "template-starter")
 *  - Remove template-only metadata ("x-template") from package.json
 *  - Replace placeholders (__APP_NAME__, __APP_ID__) in app.config.ts and __tests__/app.config.test.ts
 *  - Replace placeholders in Maestro flows (.maestro/flows/*.yml|yaml)
 *  - Replace app identity tokens in README.md and generated docs (if present)
 *  - Materialize _AGENTS.md and _CLAUDE.md as generated app root instructions
 *  - Replace tockens in Domain Config if present
 * *  - Restore .gitignore from "gitignore" (if present)
 *  - Rename _prettierrc.json → .prettierrc.json if present
 *  - Rename _prettierignore → .prettierignore if present
 *  - Copy _mise.toml → .mise.toml (runtime toolchain pins)
 *  - Copy _mcp-vscode.json → .vscode/mcp.json (creates .vscode if needed)
 *  - Copy _mcp-claude.json → .mcp.json (repo root, Claude MCP config)
 *  - Enable Husky hooks *without* using deprecated `husky install` (set hooksPath + chmod +x)
 *  - Materialize .maestro from _maestro if needed
 *  - Restore .github (delete existing .github and rename _github → .github
 *  - Ensure all shell scripts in .github are executable
 *  - Remove consumed underscore placeholders and template-sync metadata
 *  - Run Prettier to format updated files
 *  - Remove postinstall from package.json
 *  - Self-delete this script
 *  - Print a friendly summary
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
const writeJson = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n', 'utf8');
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

// Copy local-only files from the selected template checkout without replacing
// files that the generated app already has.
const copyMissingFiles = (src, dst) => {
  if (!exists(src) || !fs.lstatSync(src).isDirectory()) return false;
  fs.mkdirSync(dst, { recursive: true });
  let copied = false;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const sourcePath = path.join(src, entry.name);
    const destinationPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copied = copyMissingFiles(sourcePath, destinationPath) || copied;
    } else if (entry.isFile() && !exists(destinationPath)) {
      fs.copyFileSync(sourcePath, destinationPath);
      copied = true;
    }
  }
  return copied;
};

const updateFirebaseCredentialIds = (appId) => {
  const androidConfigPath = path.join(CWD, 'credentials', 'google-services.json');
  if (exists(androidConfigPath)) {
    try {
      const config = readJson(androidConfigPath);
      let changed = false;
      for (const client of config.client ?? []) {
        const androidClient = client.client_info?.android_client_info;
        if (androidClient?.package_name && androidClient.package_name !== appId) {
          androidClient.package_name = appId;
          changed = true;
        }
      }
      if (changed) {
        writeJson(androidConfigPath, config);
        console.log(`✅ Android Firebase package name updated: ${appId}`);
      }
    } catch (e) {
      console.log(`⚠️  Android Firebase config was not updated (${e.message})`);
    }
  }

  const iosConfigPath = path.join(CWD, 'credentials', 'GoogleService-Info.plist');
  if (exists(iosConfigPath)) {
    try {
      const before = fs.readFileSync(iosConfigPath, 'utf8');
      const bundleIdEntry = /(<key>\s*BUNDLE_ID\s*<\/key>\s*<string>)([^<]*)(<\/string>)/;
      const match = before.match(bundleIdEntry);
      if (!match) {
        console.log('⚠️  iOS Firebase config has no XML BUNDLE_ID entry; skipped');
        return;
      }
      const after = before.replace(bundleIdEntry, `$1${appId}$3`);
      if (after !== before) {
        fs.writeFileSync(iosConfigPath, after, 'utf8');
        console.log(`✅ iOS Firebase bundle ID updated: ${appId}`);
      }
    } catch (e) {
      console.log(`⚠️  iOS Firebase config was not updated (${e.message})`);
    }
  }
};

const materializeRootGuidance = (summary) => {
  for (const [templateName, appName] of [
    ['_AGENTS.md', 'AGENTS.md'],
    ['_CLAUDE.md', 'CLAUDE.md'],
  ]) {
    const templatePath = path.join(CWD, templateName);
    if (!exists(templatePath)) continue;

    try {
      const before = fs.readFileSync(templatePath, 'utf8');
      const after = before
        .replace(/\{\{APP_NAME\}\}/g, summary.appName)
        .replace(/\{\{APP_SLUG\}\}/g, summary.slug)
        .replace(/\{\{APP_ID\}\}/g, summary.appId)
        .replace(/__APP_NAME__SINGULAR__/g, summary.singular)
        .replace(/__APP_NAME__/g, summary.appName)
        .replace(/__APP_SLUG__/g, summary.slug)
        .replace(/__APP_ID__/g, summary.appId);
      fs.writeFileSync(path.join(CWD, appName), after, 'utf8');
      console.log(`✅ ${appName} materialized from ${templateName}`);
    } catch (e) {
      console.log(`⚠️  ${appName} materialization skipped (${e.message})`);
    }
  }
};

const singularize = (word) => {
  const endings = {
    ves: 'f', // wives -> wife
    ies: 'y', // strategies -> strategy
    i: 'us', // cacti -> cactus (irregular)
    zes: 'ze', // dozes -> doze
    ses: 's', // classes -> class
    es: '', // boxes -> box
    s: '', // papers -> paper
  };

  // Iterate through the endings in reverse order of length to prioritize longer matches
  for (const ending in endings) {
    if (word.endsWith(ending)) {
      return word.slice(0, -ending.length) + endings[ending];
    }
  }

  // If no specific rule applies, assume it's already singular or an irregular plural not covered
  return word;
};

// Summary for the footer
let summary = { appName: null, slug: null, appId: null, singular: null };

(function main() {
  // package.json: update name (keep minimal behavior)
  const pkgPath = path.join(CWD, 'package.json');
  if (!exists(pkgPath)) {
    console.log('⚠️  package.json not found — aborting postinstall');
    return;
  }

  const templateSourceDir = process.env.EXPO_TEMPLATE_SOURCE_DIR;
  const isGeneratedFromLocalTemplate =
    templateSourceDir && path.resolve(templateSourceDir) !== path.resolve(CWD);
  if (templateSourceDir) {
    try {
      const sourceCredentials = path.resolve(templateSourceDir, 'credentials');
      const targetCredentials = path.join(CWD, 'credentials');
      if (
        sourceCredentials !== path.resolve(targetCredentials) &&
        copyMissingFiles(sourceCredentials, targetCredentials)
      ) {
        console.log('✅ Local template credentials copied (existing files preserved)');
      }
    } catch (e) {
      console.log(`⚠️  Local template credentials were not copied (${e.message})`);
    }
  }

  const pkg = readJson(pkgPath);
  const folderName = path.basename(CWD);
  if (!pkg.name || pkg.name === 'template-starter') {
    pkg.name = folderName;
  }
  summary.appName = pkg.name;
  writeJson(pkgPath, pkg);

  // Remove x-template metadata
  if (pkg['x-template']) {
    delete pkg['x-template'];
    writeJson(pkgPath, pkg);
    console.log('🧹 Removed x-template metadata from package.json');
  }
  console.log(`✅ package.json updated: name="${pkg.name}"`);

  // app.config.ts tokens
  const appConfigPath = path.join(CWD, 'app.config.ts');
  const owner = 'luvenapps';
  const bundleIdBase = `com.${owner}`;

  // Slug for Expo (keep dashes for readability in slug/name)
  const rawName = (pkg.name || folderName).trim().toLowerCase();
  const slugSafe = rawName.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');

  // Android/iOS bundle id segment: letters/digits only, no dashes/underscores; must start with a letter
  const idSegmentBase = rawName.replace(/[^a-z0-9]+/g, '');
  const idSegment =
    /^[a-z]/.test(idSegmentBase) && idSegmentBase.length ? idSegmentBase : `app${idSegmentBase}`; // ensure it starts with a letter

  const appId = `${bundleIdBase}.${idSegment}`.replace(/\.+/g, '.');

  summary.slug = slugSafe;
  summary.appId = appId;
  summary.singular = singularize(idSegmentBase);

  materializeRootGuidance(summary);

  if (isGeneratedFromLocalTemplate) updateFirebaseCredentialIds(appId);

  if (exists(appConfigPath)) {
    try {
      const before = fs.readFileSync(appConfigPath, 'utf8');
      const after = before
        .replace(/__APP_NAME__SINGULAR__/g, summary.singular)
        .replace(/__APP_SLUG__/g, slugSafe)
        .replace(/__APP_NAME__/g, pkg.name)
        .replace(/__APP_ID__/g, appId);
      if (after !== before) fs.writeFileSync(appConfigPath, after, 'utf8');
      console.log('✅ app.config.ts updated (name, slug, bundle IDs)');
    } catch (e) {
      console.log(`⚠️  app.config.ts update skipped (${e.message})`);
    }
  }

  // __tests__/app.config.test.ts tokens
  const appConfigTestPath = path.join(CWD, '__tests__', 'app.config.test.ts');
  if (exists(appConfigTestPath)) {
    try {
      const before = fs.readFileSync(appConfigTestPath, 'utf8');
      const after = before.replace(/__APP_NAME__/g, pkg.name).replace(/__APP_SLUG__/g, slugSafe);
      if (after !== before) fs.writeFileSync(appConfigTestPath, after, 'utf8');
      console.log('✅ __tests__/app.config.test.ts updated (app name)');
    } catch (e) {
      console.log(`⚠️  __tests__/app.config.test.ts update skipped (${e.message})`);
    }
  }

  // Maestro flows (update in .maestro or _maestro if present)
  const flowRoots = [path.join(CWD, '.maestro', 'flows'), path.join(CWD, '_maestro', 'flows')];

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
      .replace(/\{\{APP_NAME\}\}/g, summary.appName)
      .replace(/\{\{APP_SLUG\}\}/g, summary.slug)
      .replace(/\{\{APP_ID\}\}/g, summary.appId)
      .replace(/__APP_NAME__/g, summary.appName)
      .replace(/__APP_SLUG__/g, summary.slug)
      .replace(/__APP_ID__/g, summary.appId);
    if (after !== before) {
      fs.writeFileSync(readmePath, after, 'utf8');
      console.log('✅ README tokens replaced.');
    }
  }

  // Replace identity tokens in copied setup and architecture documentation.
  const docsRoot = path.join(CWD, 'docs');
  if (exists(docsRoot)) {
    const visitDocs = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          visitDocs(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const before = fs.readFileSync(fullPath, 'utf8');
          const after = before
            .replace(/\{\{APP_NAME\}\}/g, summary.appName)
            .replace(/\{\{APP_SLUG\}\}/g, summary.slug)
            .replace(/\{\{APP_ID\}\}/g, summary.appId)
            .replace(/__APP_NAME__SINGULAR__/g, summary.singular)
            .replace(/__APP_NAME__/g, summary.appName)
            .replace(/__APP_SLUG__/g, summary.slug)
            .replace(/__APP_ID__/g, summary.appId);
          if (after !== before) fs.writeFileSync(fullPath, after, 'utf8');
        }
      }
    };
    visitDocs(docsRoot);
  }

  // Domain Config tokens
  const domainConfigPath = path.join(CWD, 'src/config/domain.config.ts');
  if (exists(domainConfigPath)) {
    const before = fs.readFileSync(domainConfigPath, 'utf8');
    const after = before
      .replace(/__APP_NAME__SINGULAR__/g, summary.singular)
      .replace(/__APP_NAME__/g, idSegmentBase)
      .replace(/__APP_ID__/g, summary.appId);
    if (after !== before) {
      fs.writeFileSync(domainConfigPath, after, 'utf8');
      console.log('✅ Domain config tokens replaced.');
    }
  }

  // Restore .gitignore (delete existing .gitignore and rename _gitignore → .gitignore)
  const giSrc = path.join(CWD, '_gitignore');
  const giDst = path.join(CWD, '.gitignore');

  if (exists(giSrc)) {
    try {
      if (exists(giDst)) {
        fs.unlinkSync(giDst);
        console.log('🧹 Removed existing .gitignore to replace with template version');
      }
      fs.renameSync(giSrc, giDst);
      console.log('✅ Restored .gitignore from template');
    } catch (e) {
      console.log(`⚠️  Failed to restore .gitignore (${e.message})`);
    }
  } else {
    console.log('⚠️  No gitignore found in template directory — skipping');
  }

  // Rename _prettierrc.json → .prettierrc.json if present
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

  // Rename _prettierignore → .prettierignore if present
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

  // Copy _mise.toml → .mise.toml if present
  const miseSrc = path.join(CWD, '_mise.toml');
  const miseDst = path.join(CWD, '.mise.toml');
  if (exists(miseSrc)) {
    try {
      fs.copyFileSync(miseSrc, miseDst);
      console.log('✅ Copied _mise.toml → .mise.toml');
    } catch (e) {
      console.log(`⚠️  Failed to copy _mise.toml (${e.message})`);
    }
  } else {
    console.log('⚠️  No _mise.toml found in template directory — skipping');
  }

  // Copy _mcp-vscode.json → .vscode/mcp.json if present
  const mcpVscodeSrc = path.join(CWD, '_mcp-vscode.json');
  const vscodeDst = path.join(CWD, '.vscode');
  const mcpVscodeDst = path.join(vscodeDst, 'mcp.json');
  if (exists(mcpVscodeSrc)) {
    try {
      if (!exists(vscodeDst)) fs.mkdirSync(vscodeDst, { recursive: true });
      fs.copyFileSync(mcpVscodeSrc, mcpVscodeDst);
      console.log('✅ Copied _mcp-vscode.json → .vscode/mcp.json');
    } catch (e) {
      console.log(`⚠️  Failed to copy _mcp-vscode.json (${e.message})`);
    }
  } else {
    console.log('⚠️  No _mcp-vscode.json found in template directory — skipping');
  }

  // Copy _mcp-claude.json → .mcp.json if present
  const mcpClaudeSrc = path.join(CWD, '_mcp-claude.json');
  const mcpClaudeDst = path.join(CWD, '.mcp.json');
  if (exists(mcpClaudeSrc)) {
    try {
      fs.copyFileSync(mcpClaudeSrc, mcpClaudeDst);
      console.log('✅ Copied _mcp-claude.json → .mcp.json');
    } catch (e) {
      console.log(`⚠️  Failed to copy _mcp-claude.json (${e.message})`);
    }
  } else {
    console.log('⚠️  No _mcp-claude.json found in template directory — skipping');
  }

  // Husky v9+ (no `husky install`): set hooksPath + chmod, and materialize from _husky if needed
  const isGit = runSilent('git', ['rev-parse', '--is-inside-work-tree']);
  if (!isGit) runSilent('git', ['init']);
  const huskyDst = path.join(CWD, '.husky');
  const huskySrcCandidates = [
    path.join(CWD, '_husky'), // present when installed from GitHub/npm tarball
    path.join(CWD, '.husky'), // present for local copies
  ];
  const huskySrc = huskySrcCandidates.find(exists);

  if (huskySrc) {
    try {
      copyDir(huskySrc, huskyDst);
      runSilent('git', ['config', 'core.hooksPath', '.husky']);
      for (const f of fs.readdirSync(huskyDst)) {
        const p = path.join(huskyDst, f);
        if (fs.lstatSync(p).isFile()) {
          try {
            fs.chmodSync(p, 0o755);
          } catch {}
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

  // Materialize Maestro folder (.maestro) from _maestro if needed
  const maestroDst = path.join(CWD, '.maestro');
  const maestroSrcCandidates = [path.join(CWD, '_maestro'), path.join(CWD, '.maestro')];
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

  // Restore .github (delete existing .github and rename _github → .github)
  const githubDst = path.join(CWD, '.github');
  const githubSrcCandidates = [path.join(CWD, '_github'), path.join(CWD, '.github')];
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

  // Ensure all shell scripts in .github are executable
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

  // Remove underscore placeholders only after their generated counterparts exist.
  // These are template source files, not part of a generated app.
  const materializedTemplatePaths = [
    ['_AGENTS.md', 'AGENTS.md'],
    ['_CLAUDE.md', 'CLAUDE.md'],
    ['_mise.toml', '.mise.toml'],
    ['_mcp-vscode.json', '.vscode/mcp.json'],
    ['_mcp-claude.json', '.mcp.json'],
    ['_husky', '.husky'],
    ['_maestro', '.maestro'],
    ['_github', '.github'],
    ['_gitignore', '.gitignore'],
    ['_prettierrc.json', '.prettierrc.json'],
    ['_prettierignore', '.prettierignore'],
  ];
  for (const [templatePath, generatedPath] of materializedTemplatePaths) {
    const templateFile = path.join(CWD, templatePath);
    const generatedFile = path.join(CWD, generatedPath);
    if (!exists(templateFile) || !exists(generatedFile)) continue;

    try {
      fs.rmSync(templateFile, { recursive: true, force: true });
      console.log(`🧹 Removed ${templatePath} template placeholder`);
    } catch (e) {
      console.log(`⚠️  Failed to remove ${templatePath} (${e.message})`);
    }
  }

  // This manifest configures expo-template's source-sync workflow only.
  const syncManifest = path.join(CWD, '.template-sync-manifest.json');
  if (exists(syncManifest)) {
    try {
      fs.unlinkSync(syncManifest);
      console.log('🧹 Removed expo-template sync manifest');
    } catch (e) {
      console.log(`⚠️  Failed to remove expo-template sync manifest (${e.message})`);
    }
  }

  // Run Prettier to format updated files (single-line status)
  try {
    process.stdout.write('🧩 Formatting with Prettier...');
    cp.execSync('npx prettier --write .', { stdio: 'ignore' });
    process.stdout.write(' ✅ Done!\n');
  } catch (err) {
    console.log(`\n⚠️  Prettier formatting skipped or failed: ${err.message}`);
  }

  // Run database migrations
  try {
    process.stdout.write('🗄️  Running database migrations...');
    cp.execSync('npm run db:migrate', { stdio: 'ignore' });
    process.stdout.write(' ✅ Done!\n');
  } catch (err) {
    console.log(`\n⚠️  Database migrations skipped or failed: ${err.message}`);
  }

  // Remove postinstall from package.json
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

  // Self-delete
  const self = path.join(CWD, 'scripts', 'postinstall.js');
  try {
    process.on('exit', () => {
      try {
        if (exists(self)) fs.unlinkSync(self);
      } catch {}
      console.log('🧹 Removed scripts/postinstall.js');
    });
  } catch {}

  // Summary
  const bar = '============================================================';
  console.log(`
${bar}
✅ App bootstrap complete
📦 Name: ${summary.appName}
🔖 Slug: ${summary.slug}
🏷️  App ID: ${summary.appId}

Next step: run \`npm run setup:local\` to install all local dependencies
           (mise, fastlane, watchman) and activate the pinned runtimes.
${bar}
`);
})();
