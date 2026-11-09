#!/usr/bin/env node
/**
 * Copy a source app snapshot into the reusable template while preserving the
 * template bootstrap and converting selected paths to visible placeholders.
 * Root guidance files are copied under underscore names so the template's own
 * root instructions remain separate from the generated app's instructions.
 * Source files are copied as data; this script never executes source code.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';

const TEMPLATE_ONLY = new Set([
  '.env.example',
  'AGENTS.md',
  'CLAUDE.md',
  'LICENSE',
  'scripts/postinstall.js',
  'scripts/sync-template-source.mjs',
  '__tests__/scripts/sync-template-source.test.js',
  'docs/template-refresh.md',
  '.github/workflows/template-sync.yml',
  '.template-sync-manifest.json',
  '_mcp-claude.json',
  '_mcp-vscode.json',
  'credentials.json',
]);

const SYNCED_ROOT_GUIDANCE_FILES = new Set(['AGENTS.md', 'CLAUDE.md']);

const MANAGED_ROOTS = [
  'app',
  'src',
  '__tests__',
  '__mocks__',
  'plugins',
  'public',
  'supabase',
  'scripts',
  'docs',
  '_github',
  '.husky',
  '_husky',
  '.maestro',
  '_maestro',
  'eslint-rules',
];

const MANAGED_ROOT_FILES = new Set([
  'README.md',
  '.env.example',
  '.gitignore',
  '_gitignore',
  '_AGENTS.md',
  '_CLAUDE.md',
  '.mise.toml',
  '_mise.toml',
  '.prettierignore',
  '_prettierignore',
  '.prettierrc.json',
  '_prettierrc.json',
  '.mcp.json',
  'app.config.ts',
  'babel.config.js',
  'commitlint.config.js',
  'drizzle.config.postgres.ts',
  'drizzle.config.sqlite.ts',
  'eas.json',
  'eslint.config.js',
  'index.js',
  'jest.config.js',
  'metro.config.js',
  'package-lock.json',
  'package.json',
  'renovate.json',
  'tamagui.build.ts',
  'tamagui.config.ts',
  'tsconfig.json',
]);

const EXCLUDED_DIRS = new Set([
  'credentials',
  '.git',
  '.expo',
  '.vscode',
  'android',
  'ios',
  'node_modules',
  'coverage',
  'dist',
  'build',
  'e2e-artifacts',
  'certs',
]);

const EXCLUDED_FILES = new Set(['.DS_Store', 'credentials.json']);

const EXCLUDED_PREFIXES = [
  '.github/runner/',
  'assets/',
  'docs/habit-tracker/',
  'docs/habit-tracker-plan.md',
  'docs/roadmap.md',
  'docs/updates.md',
  'src/db/sqlite/migrations/',
  'supabase/migrations/',
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--dry-run') {
      args.dryRun = true;
    } else if (key === '--source-dir' || key === '--target-dir') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
      args[key === '--source-dir' ? 'sourceDir' : 'targetDir'] = value;
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${key}`);
    }
  }
  if (!args.sourceDir || !args.targetDir) {
    throw new Error(
      'Usage: node scripts/sync-template-source.mjs --source-dir <path> --target-dir <path> [--dry-run]',
    );
  }
  return args;
}

function walkFiles(root, relative = '') {
  const directory = path.join(root, relative);
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink()) return [];
    const relativePath = path.posix.join(relative.split(path.sep).join('/'), entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) return [];
      return walkFiles(root, relativePath);
    }
    return entry.isFile() ? [relativePath] : [];
  });
}

function shouldExclude(sourcePath) {
  const basename = path.posix.basename(sourcePath);
  if (EXCLUDED_FILES.has(basename)) return true;
  if (['claude.md', 'LICENSE'].includes(sourcePath)) {
    return true;
  }
  if (sourcePath.startsWith('assets/')) return true;
  if (sourcePath.startsWith('docs/habit-tracker/')) return true;
  if (EXCLUDED_PREFIXES.some((prefix) => sourcePath.startsWith(prefix))) return true;
  if (/^\.env\.(?!example$)/.test(basename) || /^\.env$/.test(basename)) return true;
  if (/\.(?:p12|p8|mobileprovision|keystore|jks)$/i.test(basename)) return true;
  return false;
}

function transformAppConfig(content) {
  return content
    .replaceAll("'com.luvenapps.betterhabits'", "'__APP_ID__'")
    .replace(
      "name: isPreview ? 'betterhabits (Preview)' : 'betterhabits'",
      "name: isPreview ? '__APP_NAME__ (Preview)' : '__APP_NAME__'",
    )
    .replace("slug: 'betterhabits'", "slug: '__APP_SLUG__'")
    .replaceAll("scheme: 'betterhabits'", "scheme: '__APP_SLUG__'")
    .replaceAll("'betterhabits'", "'__APP_NAME__'")
    .replace("appleTeamId: 'HWJZHVS443'", "appleTeamId: ''")
    .replace(/\s+eas: \{\s+projectId: '[^']+',\s+\},/g, '')
    .replace(/url: 'https:\/\/u\.expo\.dev\/[^']+'/g, 'enabled: false');
}

function transformDomainConfig(content) {
  return content
    .replaceAll("'betterhabits.db'", "'__APP_NAME__.db'")
    .replaceAll("'betterhabits-sync-task'", "'__APP_NAME__-sync-task'")
    .replaceAll("'betterhabits-sync-cursors'", "'__APP_NAME__-sync-cursors'")
    .replaceAll("'betterhabits-analytics-id'", "'__APP_NAME__-analytics-id'")
    .replaceAll("'betterhabits-analytics'", "'__APP_NAME__-analytics'")
    .replaceAll("'betterhabits'", "'__APP_NAME__'")
    .replaceAll("'Better Habits'", "'__APP_NAME__'")
    .replaceAll("'habit_entries'", "'__APP_NAME__SINGULAR___entries'")
    .replaceAll("'habits'", "'__APP_NAME__'")
    .replaceAll("'habitId'", "'__APP_NAME__SINGULAR__Id'")
    .replaceAll("'habit_id'", "'__APP_NAME__SINGULAR___id'")
    .replaceAll("'habit'", "'__APP_NAME__SINGULAR__'")
    .replaceAll("'Habit'", "'__APP_NAME__SINGULAR__'");
}

function transformDocumentation(content) {
  return content
    .replaceAll('Better Habits', '{{APP_NAME}}')
    .replaceAll('BetterHabits', '{{APP_NAME}}')
    .replaceAll('betterhabits://', '{{APP_SLUG}}://')
    .replaceAll('betterhabits.db', '{{APP_NAME}}.db')
    .replaceAll('betterhabits.ipa', '{{APP_SLUG}}.ipa')
    .replaceAll('betterhabits.aab', '{{APP_SLUG}}.aab')
    .replaceAll('com.luvenapps.betterhabits', '{{APP_ID}}')
    .replaceAll('HWJZHVS443', 'YOUR_APPLE_TEAM_ID')
    .replaceAll('betterhabits.com', 'yourdomain.com')
    .replaceAll('betterhabits', '{{APP_SLUG}}')
    .replace(/^- \[Roadmap\]\(\.\/roadmap\.md\) - Current status and upcoming milestones\s*$/gm, '')
    .replace(
      'Stage 7 database work—and eventual habit UI',
      'future database work and product features',
    )
    .replace(
      /^Keeping these reports up to date.*$/m,
      'Keeping these reports up to date helps spot size increases as the app grows.',
    );
}

function transformReadme(content) {
  // Keep the source README, adapting only scaffold setup and app identity.
  content = content
    .replace(/```typescript\nexport const DOMAIN = \{[\s\S]*?\n```/, (block) =>
      transformDomainConfig(block)
        .replaceAll('__APP_NAME__SINGULAR__', '{{APP_ENTITY_NAME}}')
        .replaceAll('__APP_NAME__', '{{APP_DOMAIN_NAME}}'),
    )
    .replaceAll('betterhabits.db', '{{APP_DOMAIN_NAME}}.db')
    .replace(/\?token=[^\s)]+/g, '')
    .replace(
      /## 🧭 EAS Project\n[\s\S]*?(?=\n---)/,
      '## 🧭 EAS Project\n\nCreate an Expo project for your new app, run `eas init --id <PROJECT_ID>`, and set `extra.eas.projectId` in `app.config.ts`. Configure Expo Updates with your own project URL before publishing updates.\n',
    )
    .replace(/^.*\[Roadmap\]\(docs\/roadmap\.md\).*\n/gm, '');

  content = transformDocumentation(content);
  return content.replace(
    '\n---\n',
    '\n## Create a new app\n\nRun `npx create-expo-app my-app --template /path/to/expo-template` from the parent directory for your new app. Postinstall fills app identity placeholders and restores hidden configuration files. Run the development commands below inside the generated app.\n\nSee [the refresh guide](docs/template-refresh.md) for syncing this template from the source app.\n\n---\n',
  );
}

function transformContent(sourcePath, outputPath, content) {
  if (sourcePath === 'README.md') return transformReadme(content);
  if (outputPath === 'app.config.ts') return transformAppConfig(content);
  if (outputPath === 'src/config/domain.config.ts') return transformDomainConfig(content);
  if (sourcePath === 'package.json' || sourcePath === 'package-lock.json') {
    return transformPackage(sourcePath, content);
  }
  if (sourcePath === '__tests__/app.config.test.ts') {
    return content
      .replace("slug: 'betterhabits'", "slug: '__APP_SLUG__'")
      .replace(
        'keeps slug as betterhabits in preview mode',
        'keeps the configured slug in preview mode',
      )
      .replace(
        'keeps slug as betterhabits in production mode',
        'keeps the configured slug in production mode',
      )
      .replaceAll("'betterhabits (Preview)'", "'__APP_NAME__ (Preview)'")
      .replaceAll("'betterhabits'", "'__APP_NAME__'")
      .replaceAll("config.slug).toBe('__APP_NAME__')", "config.slug).toBe('__APP_SLUG__')");
  }
  if (sourcePath === '__tests__/app/(tabs)/settings/terms.test.tsx') {
    content = content.replace(
      '/Le damos la bienvenida a Better Habits/',
      '/Le damos la bienvenida a/',
    );
  }
  if (sourcePath === '__tests__/config/tamagui-build.test.ts') {
    content = content.replaceAll('betterhabits-metro-test', 'template-metro-test');
  }
  if (/^\.(?:github|husky|maestro)\//.test(sourcePath)) {
    content = content.replaceAll('com.luvenapps.betterhabits', '__APP_ID__');
  }
  if (sourcePath.endsWith('/ci-expo-go.yml')) {
    content = content.replaceAll(
      'https://expo.dev/accounts/luvenapps/projects/betterhabits/updates',
      'https://expo.dev/accounts/${{ github.repository_owner }}/projects/${{ github.event.repository.name }}/updates',
    );
  }
  if (
    sourcePath === 'src/notifications/firebasePush.ts' ||
    sourcePath === 'public/firebase-messaging-sw.js'
  ) {
    content = content.replaceAll('Better Habits', 'App');
  }
  if (sourcePath === 'scripts/setup-local-deps.sh') {
    content = content.replaceAll('betterhabits setup:local', 'template setup:local');
  }
  if (sourcePath === 'docs/GITHUBACTIONS.md') {
    content = content.replace(
      /## 💻 Self-hosted runner baseline[\s\S]*?(?=## 🔐 Permissions)/,
      '## 💻 Self-hosted runner\n\nSelf-hosted workflows use the runner installed on your development machine. Runner registration and service management are machine-level setup and are intentionally kept out of this repository.\n\n---\n\n',
    );
  }
  if (sourcePath.startsWith('docs/') && sourcePath.endsWith('.md')) {
    content = transformDocumentation(content);
  }
  return content;
}

function transformPackage(sourcePath, content) {
  const value = JSON.parse(content);
  if (sourcePath === 'package.json') {
    value.name = 'template-starter';
    value.license = 'MIT';
    value.author = 'LuvenApps <github@luvenapps.com>';
    value.private = true;
    value.scripts ??= {};
    value.scripts.postinstall = 'node scripts/postinstall.js';
    value['x-template'] = {
      bundleIdBase: 'com.luvenapps',
      templateName: 'template-starter',
    };
  } else {
    value.name = 'template-starter';
    value.packages ??= {};
    value.packages[''] ??= {};
    value.packages[''].name = 'template-starter';
  }
  return `${JSON.stringify(value, null, 2)}\n`;
}

function outputPaths(sourcePath) {
  const mappings = new Map([
    ['.github', ['_github']],
    ['.husky', ['_husky']],
    ['.maestro', ['_maestro']],
  ]);
  for (const [sourceRoot, targetRoots] of mappings) {
    if (sourcePath === sourceRoot || sourcePath.startsWith(`${sourceRoot}/`)) {
      return targetRoots.map((root) => sourcePath.replace(sourceRoot, root));
    }
  }
  const hiddenFileMappings = new Map([
    ['AGENTS.md', ['_AGENTS.md']],
    ['CLAUDE.md', ['_CLAUDE.md']],
    ['.gitignore', ['.gitignore', '_gitignore']],
    ['.mise.toml', ['.mise.toml', '_mise.toml']],
    ['.prettierignore', ['_prettierignore']],
    ['.prettierrc.json', ['_prettierrc.json']],
  ]);
  return hiddenFileMappings.get(sourcePath) ?? [sourcePath];
}

function isManagedPath(relativePath) {
  if (MANAGED_ROOT_FILES.has(relativePath)) return true;
  return MANAGED_ROOTS.some((root) => relativePath === root || relativePath.startsWith(`${root}/`));
}

function removePath(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  const stat = fs.lstatSync(targetPath);
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(targetPath)) removePath(path.join(targetPath, child));
    fs.rmdirSync(targetPath);
  } else {
    fs.unlinkSync(targetPath);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceRoot = path.resolve(args.sourceDir);
  const targetRoot = path.resolve(args.targetDir);
  if (!fs.statSync(sourceRoot).isDirectory() || !fs.statSync(targetRoot).isDirectory()) {
    throw new Error('Both source and target must be existing directories.');
  }

  const desired = new Map();
  for (const sourcePath of walkFiles(sourceRoot)) {
    if (
      shouldExclude(sourcePath) ||
      (TEMPLATE_ONLY.has(sourcePath) && !SYNCED_ROOT_GUIDANCE_FILES.has(sourcePath))
    ) {
      continue;
    }
    const sourceFile = path.join(sourceRoot, sourcePath);
    let content = fs.readFileSync(sourceFile);
    const text = content.toString('utf8');
    const isText = !text.includes('\u0000');
    for (const outputPath of outputPaths(sourcePath)) {
      if (TEMPLATE_ONLY.has(outputPath)) continue;
      let outputContent = content;
      if (isText) outputContent = Buffer.from(transformContent(sourcePath, outputPath, text));
      if (isText && sourcePath === 'scripts/troubleshoot.mjs') {
        const content = outputContent
          .toString('utf8')
          .replace(
            /\n\s*\/\/ Self-hosted GitHub Actions runner \(optional\)[\s\S]*?(?=\n\s*\/\/ Expo peer deps)/,
            '',
          )
          .replace(/^ \* - Self-hosted GitHub Actions runner\r?\n/m, '')
          .replace(/^import os from 'node:os';\r?\n/m, '');
        outputContent = Buffer.from(content);
      }
      desired.set(outputPath, {
        content: outputContent,
        mode: fs.statSync(sourceFile).mode & 0o777,
      });
    }
  }

  // The selected roots are source-owned as a whole. Recursively compare the
  // target with the desired snapshot so newly added files flow without a
  // hand-maintained per-file manifest; TEMPLATE_ONLY protects template files.
  const oldPaths = walkFiles(targetRoot).filter(isManagedPath);
  const stale = oldPaths.filter(
    (relativePath) =>
      !desired.has(relativePath) && !TEMPLATE_ONLY.has(relativePath) && isManagedPath(relativePath),
  );

  console.log(`Source files selected: ${desired.size}`);
  console.log(`Stale managed files to remove: ${stale.length}`);
  for (const relativePath of stale) console.log(`  remove ${relativePath}`);
  for (const [relativePath, file] of desired) {
    const targetFile = path.join(targetRoot, relativePath);
    const current = fs.existsSync(targetFile) ? fs.readFileSync(targetFile) : null;
    if (!current || !current.equals(file.content)) console.log(`  update ${relativePath}`);
  }
  if (args.dryRun) return;

  for (const relativePath of stale) removePath(path.join(targetRoot, relativePath));
  for (const [relativePath, file] of desired) {
    const targetFile = path.join(targetRoot, relativePath);
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.writeFileSync(targetFile, file.content, { mode: file.mode || 0o644 });
    fs.chmodSync(targetFile, file.mode || 0o644);
  }
}

try {
  main();
} catch (error) {
  console.error(`Template source sync failed: ${error.message}`);
  process.exitCode = 1;
}
