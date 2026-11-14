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
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { createInterface } from 'node:readline/promises';
import { Buffer } from 'node:buffer';

const TEMPLATE_ONLY = new Set([
  '.env.example',
  'AGENTS.md',
  'CLAUDE.md',
  'LICENSE',
  'scripts/postinstall.js',
  'scripts/sync-template-source.mjs',
  '__tests__/scripts/sync-template-source.test.js',
  '__tests__/scripts/sync-template-source.test.ts',
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
  '_renovate.json',
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
  '.builds',
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
  'src/db/postgres/rls-policies.sql',
  'src/db/sqlite/migrations/',
  'supabase/.branches/',
  'supabase/.temp/',
  'supabase/migrations/',
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--dry-run') {
      args.dryRun = true;
    } else if (key === '--yes') {
      args.yes = true;
    } else if (
      key === '--source-dir' ||
      key === '--target-dir' ||
      key === '--source-repository' ||
      key === '--source-branch'
    ) {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
      const argName = {
        '--source-dir': 'sourceDir',
        '--target-dir': 'targetDir',
        '--source-repository': 'sourceRepository',
        '--source-branch': 'sourceBranch',
      }[key];
      args[argName] = value;
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${key}`);
    }
  }
  if (!args.sourceDir || !args.targetDir) {
    throw new Error(
      'Usage: node scripts/sync-template-source.mjs --source-dir <path> --target-dir <path> [--dry-run] [--source-repository <owner/name>] [--source-branch <branch>] [--yes]',
    );
  }
  return args;
}

function runGit(repositoryPath, gitArgs) {
  return execFileSync('git', ['-C', repositoryPath, ...gitArgs], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
}

function inferSourceRepository(sourceRoot, override) {
  if (override) return override;
  let remote;
  try {
    remote = runGit(sourceRoot, ['config', '--get', 'remote.origin.url']);
  } catch {
    throw new Error('Could not infer the source repository. Pass --source-repository <owner/name>.');
  }
  const match = remote.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?\/?$/);
  if (!match) {
    throw new Error(`Could not infer owner/name from source origin ${remote}. Pass --source-repository.`);
  }
  return match[1];
}

function renderPullRequestDescription(sourceRoot, manifest, args) {
  const sourceRepository = inferSourceRepository(sourceRoot, args.sourceRepository);
  let sourceBranch = args.sourceBranch;
  if (!sourceBranch) {
    sourceBranch = runGit(sourceRoot, ['branch', '--show-current']);
    if (!sourceBranch) {
      throw new Error('The source checkout is detached. Pass --source-branch <branch>.');
    }
  }

  const sourceSha = runGit(sourceRoot, ['rev-parse', 'HEAD']);
  const previousSha = manifest.sources?.[sourceRepository]?.[sourceBranch];
  let sourceCommits;

  if (previousSha) {
    try {
      runGit(sourceRoot, ['merge-base', '--is-ancestor', previousSha, sourceSha]);
    } catch {
      throw new Error(
        `Last synced source commit ${previousSha} is not an ancestor of ${sourceRepository}@${sourceBranch}. Review the source history rewrite and update .template-sync-manifest.json.`,
      );
    }

    const commitLines = runGit(sourceRoot, [
      'log',
      '--format=%h%x09%s',
      `${previousSha}..${sourceSha}`,
    ]);
    sourceCommits = commitLines
      ? commitLines
          .split('\n')
          .map((line) => {
            const separator = line.indexOf('\t');
            return `- \`${line.slice(0, separator)}\` ${line.slice(separator + 1)}`;
          })
          .join('\n')
      : '- No new source commits since the previous sync.';
  } else {
    sourceCommits = `- No previous sync baseline is recorded for this repository and branch. This run establishes the baseline at \`${sourceSha}\`.`;
  }

  const description = [
    `Refresh the reusable app foundation from \`${sourceRepository}@${sourceSha}\`.`,
    '',
    'Source commits since the last sync of this source branch:',
    sourceCommits,
    '',
    'Review the diff for product-specific code, credentials, template bootstrap behavior, and hidden-file materialization. Run the generated-app checks in CI before merging.',
    '',
    `Source branch: \`${sourceBranch}\``,
  ].join('\n');

  return { sourceSha, previousSha, sourceRepository, sourceBranch, sourceCommits, description };
}

async function confirmApply() {
  if (!process.stdin.isTTY) {
    throw new Error('Confirmation requires a terminal. Use --yes for an automated run.');
  }
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question('Apply this sync to the target directory? [y/N] ');
    return /^y(?:es)?$/i.test(answer.trim());
  } finally {
    prompt.close();
  }
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
    ['renovate.json', ['_renovate.json']],
    ['.prettierignore', ['_prettierignore']],
    ['.prettierrc.json', ['_prettierrc.json']],
  ]);
  return hiddenFileMappings.get(sourcePath) ?? [sourcePath];
}

function isManagedPath(relativePath) {
  if (MANAGED_ROOT_FILES.has(relativePath)) return true;
  return MANAGED_ROOTS.some((root) => relativePath === root || relativePath.startsWith(`${root}/`));
}

function isManagedSourcePath(sourcePath) {
  if (SYNCED_ROOT_GUIDANCE_FILES.has(sourcePath)) return true;
  return outputPaths(sourcePath).some(isManagedPath);
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceCheckout = path.resolve(args.sourceDir);
  const targetRoot = path.resolve(args.targetDir);
  if (!fs.statSync(sourceCheckout).isDirectory() || !fs.statSync(targetRoot).isDirectory()) {
    throw new Error('Both source and target must be existing directories.');
  }
  args.sourceRepository = inferSourceRepository(sourceCheckout, args.sourceRepository);
  args.sourceBranch ??= 'main';

  // Fetch explicitly: the local checkout's HEAD and working files are never the source.
  console.log(`Fetching ${args.sourceRepository}@${args.sourceBranch} from origin...`);
  runGit(sourceCheckout, ['fetch', 'origin', args.sourceBranch]);
  const sourceSha = runGit(sourceCheckout, ['rev-parse', 'FETCH_HEAD^{commit}']);
  console.log(`Fetched source commit: ${sourceSha}`);
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'template-sync-source-'));
  const sourceRoot = path.join(temporaryDirectory, 'checkout');
  let attached = false;
  const cleanup = () => {
    if (attached) {
      console.log(`Removing temporary source worktree: ${sourceRoot}`);
      runGit(sourceCheckout, ['worktree', 'remove', '--force', sourceRoot]);
      attached = false;
      console.log('Temporary source worktree removed.');
    }
    console.log(`Deleting temporary source directory: ${temporaryDirectory}`);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    console.log('Source cleanup complete.');
  };
  const interrupt = () => {
    console.log('Sync interrupted. Cleaning up the temporary source worktree...');
    try { cleanup(); } catch (error) { console.error(`Source worktree cleanup failed: ${error.message}`); }
    process.exit(130);
  };
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    console.log(`Creating detached source worktree at ${sourceSha}: ${sourceRoot}`);
    runGit(sourceCheckout, ['worktree', 'add', '--detach', sourceRoot, sourceSha]);
    attached = true;
    console.log('Temporary source worktree ready.');
    await syncSnapshot(args, sourceRoot, targetRoot, sourceCheckout);
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
    cleanup();
  }
}

async function syncSnapshot(args, sourceRoot, targetRoot, sourceCheckout) {
  console.log(`Checking target checkout: ${targetRoot}`);
  if (runGit(targetRoot, ['rev-parse', '--show-toplevel']) !== targetRoot) {
    throw new Error('The target must be the root of the expo-template Git checkout.');
  }
  const sourceRelative = path.relative(targetRoot, sourceCheckout).split(path.sep).join('/');
  const targetPaths = ['.'];
  if (sourceRelative && !sourceRelative.startsWith('../') && !path.isAbsolute(sourceRelative)) {
    targetPaths.push(`:(exclude)${sourceRelative}`);
  }
  if (runGit(sourceRoot, ['status', '--porcelain', '--untracked-files=no'])) {
    throw new Error('Commit tracked source changes before syncing so the source SHA describes the files.');
  }

  // Preview and apply both use the same freshly fetched destination main.
  console.log('Fetching latest template origin/main...');
  runGit(targetRoot, ['fetch', 'origin', 'main']);
  const baseSha = runGit(targetRoot, ['rev-parse', 'FETCH_HEAD']);
  console.log(`Fetched template main: ${baseSha}`);
  console.log('Reading committed template files and the source sync baseline...');
  const trackedTarget = runGit(targetRoot, ['ls-tree', '-r', '--name-only', baseSha])
    .split('\n').filter(Boolean);
  const manifest = trackedTarget.includes('.template-sync-manifest.json')
    ? JSON.parse(runGit(targetRoot, ['show', `${baseSha}:.template-sync-manifest.json`]))
    : { sources: {} };
  const summary = renderPullRequestDescription(sourceRoot, manifest, args);
  if (summary.previousSha === summary.sourceSha) {
    console.log(`Nothing to update. ${summary.sourceRepository}@${summary.sourceBranch} is already synced at ${summary.sourceSha}.`);
    return;
  }

  console.log('Selecting tracked source files and applying template transformations...');
  const desired = new Map();
  for (const sourcePath of runGit(sourceRoot, ['ls-files', '-z']).split('\0').filter(Boolean)) {
    if (
      !isManagedSourcePath(sourcePath) ||
      shouldExclude(sourcePath) ||
      (TEMPLATE_ONLY.has(sourcePath) && !SYNCED_ROOT_GUIDANCE_FILES.has(sourcePath))
    ) {
      continue;
    }
    const sourceFile = path.join(sourceRoot, sourcePath);
    if (!fs.existsSync(sourceFile) || fs.lstatSync(sourceFile).isSymbolicLink()) continue;
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

  console.log(`Comparing ${desired.size} selected files with template main...`);
  // Compare committed destination files only; ignored local artifacts are not managed.
  const stale = trackedTarget.filter(
    (relativePath) => isManagedPath(relativePath) && !desired.has(relativePath) && !TEMPLATE_ONLY.has(relativePath),
  );
  const updates = [];
  for (const [relativePath, file] of desired) {
    let current = null;
    let mode = null;
    if (trackedTarget.includes(relativePath)) {
      current = execFileSync('git', ['-C', targetRoot, 'show', `${baseSha}:${relativePath}`], {
        maxBuffer: 64 * 1024 * 1024,
      });
      mode = runGit(targetRoot, ['ls-tree', baseSha, '--', relativePath]).split(' ')[0];
    }
    const desiredMode = file.mode & 0o111 ? '100755' : '100644';
    if (!current || !current.equals(file.content) || mode !== desiredMode) updates.push(relativePath);
  }
  if (!updates.length && !stale.length) {
    console.log('Nothing to update. New source commits do not change the managed template files.');
    return;
  }

  console.log(`Source: ${summary.sourceRepository}@${summary.sourceBranch} (${summary.sourceSha})`);
  console.log(`Target: origin/main (${baseSha})`);
  console.log(`Files to update: ${updates.length}`);
  for (const relativePath of updates) console.log(`  update ${relativePath}`);
  console.log(`Files to remove: ${stale.length}`);
  for (const relativePath of stale) console.log(`  remove ${relativePath}`);
  const commitMessage = 'chore: sync reusable app foundation';
  const sourceRepositoryName = summary.sourceRepository.split('/').pop();
  const title = `chore: refresh expo-template from ${sourceRepositoryName}`;
  console.log(`\nPR title: ${title}\n\nPR description preview:\n`);
  console.log(summary.description);
  if (args.dryRun) {
    console.log('\nDry run complete. No target files were changed; no branch or PR was created.');
    return;
  }
  console.log('Checking that the target is clean before applying...');
  if (!args.dryRun && runGit(targetRoot, ['status', '--porcelain', '--', ...targetPaths])) {
    throw new Error('The target has uncommitted changes. Commit them before creating a sync branch.');
  }
  if (args.yes) console.log('Confirmation supplied with --yes.');
  if (!args.yes && !(await confirmApply())) {
    console.log('Sync cancelled. No files were changed.');
    return;
  }

  console.log('Rechecking source and target after preview...');
  if (runGit(sourceRoot, ['rev-parse', 'HEAD']) !== summary.sourceSha ||
      runGit(sourceRoot, ['status', '--porcelain', '--untracked-files=no'])) {
    throw new Error('The source changed during review. Run the sync again.');
  }

  if (runGit(targetRoot, ['status', '--porcelain', '--', ...targetPaths])) {
    throw new Error('The target changed during review. Commit the changes and run the sync again.');
  }

  // Verify publishing prerequisites before changing the target checkout.
  console.log('Checking GitHub CLI authentication...');
  execFileSync('gh', ['auth', 'status'], { cwd: targetRoot, stdio: ['ignore', 'pipe', 'pipe'] });
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').replace(/\.\d{3}Z$/, 'Z');
  const branch = `automation/template-source-sync-${timestamp}`;
  console.log(`Creating and switching to branch ${branch} from ${baseSha}...`);
  runGit(targetRoot, ['switch', '-c', branch, baseSha]);
  for (const relativePath of stale) {
    console.log(`Removing target file: ${relativePath}`);
    removePath(path.join(targetRoot, relativePath));
  }
  for (const relativePath of updates) {
    console.log(`Writing target file: ${relativePath}`);
    const file = desired.get(relativePath);
    const targetFile = path.join(targetRoot, relativePath);
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.writeFileSync(targetFile, file.content, { mode: file.mode || 0o644 });
    fs.chmodSync(targetFile, file.mode || 0o644);
  }
  console.log(`Recording synced source SHA ${summary.sourceSha} in .template-sync-manifest.json...`);
  manifest.sources ??= {};
  manifest.sources[summary.sourceRepository] ??= {};
  manifest.sources[summary.sourceRepository][summary.sourceBranch] = summary.sourceSha;
  fs.writeFileSync(path.join(targetRoot, '.template-sync-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('Staging the planned changes and source sync manifest...');
  runGit(targetRoot, ['add', '-A', '--', ...updates, ...stale, '.template-sync-manifest.json']);
  console.log(`Committing: ${commitMessage}`);
  runGit(targetRoot, ['commit', '-m', commitMessage]);
  console.log(`Created commit: ${runGit(targetRoot, ['rev-parse', 'HEAD'])}`);
  // Include a target update that arrived while the user reviewed the preview.
  console.log('Fetching template main again before publishing...');
  runGit(targetRoot, ['fetch', 'origin', 'main']);
  const latestMain = runGit(targetRoot, ['rev-parse', 'FETCH_HEAD']);
  console.log(`Merging latest template main (${latestMain}) into ${branch}...`);
  runGit(targetRoot, ['merge', '--no-edit', latestMain]);
  runGit(targetRoot, ['merge-base', '--is-ancestor', latestMain, 'HEAD']);
  console.log('Verified latest template main is included.');
  console.log(`Pushing branch: ${branch}`);
  runGit(targetRoot, ['push', '-u', 'origin', branch]);
  console.log('Branch pushed.');
  const bodyDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'template-sync-pr-'));
  try {
    const bodyFile = path.join(bodyDirectory, 'body.md');
    console.log(`Writing temporary PR description: ${bodyFile}`);
    fs.writeFileSync(bodyFile, summary.description);
    console.log(`Opening PR from ${branch} to main...`);
    const url = execFileSync('gh', ['pr', 'create', '--base', 'main', '--head', branch,
      '--title', title, '--body-file', bodyFile], { cwd: targetRoot, encoding: 'utf8' }).trim();
    console.log(`\nCreated ${url}`);
  } finally {
    console.log(`Deleting temporary PR description directory: ${bodyDirectory}`);
    fs.rmSync(bodyDirectory, { recursive: true, force: true });
    console.log('Temporary PR description removed.');
  }
}

main().catch((error) => {
  console.error(`Template source sync failed: ${error.message}`);
  process.exitCode = 1;
});
