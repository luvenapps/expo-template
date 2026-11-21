#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

function statusOf(result) {
  if (result.status !== null && result.status !== undefined) return result.status;
  return result.error?.code === 'ENOENT' ? 127 : 1;
}

function printResult(result, io) {
  if (result.stdout) io.stderr.write(result.stdout);
  if (result.stderr) io.stderr.write(result.stderr);
  if (result.error) io.stderr.write(`${result.error.message}\n`);
}

function run(command, args, options, runCommand) {
  return runCommand(command, args, options);
}

function valueAfterLabel(output, label) {
  const line = output.split(/\r?\n/).find((item) => new RegExp(`^${label}[\\t ]+`).test(item));
  return (
    line
      ?.trim()
      .split(/[\t ]+/)
      .at(-1) ?? ''
  );
}

export function exportAndDeployWeb(argv = process.argv.slice(2), options = {}) {
  const eventName = argv[0] ?? '';
  const prNumber = argv[1] ?? '';
  const env = options.env ?? process.env;
  const io = options.io ?? process;
  const cwd = options.cwd ?? process.cwd();
  const runCommand = options.runCommand ?? spawnSync;
  const makeTempDirectory = options.makeTempDirectory ?? mkdtempSync;
  const fileSystem = options.fileSystem ?? { closeSync, openSync, readFileSync, rmSync };

  if (!eventName) {
    io.stderr.write('Usage: export_and_deploy_web.mjs <event_name> [pr_number]\n');
    return 1;
  }

  const easCliVersion = env.EAS_CLI_VERSION ?? '';
  if (!easCliVersion) {
    io.stderr.write('EAS_CLI_VERSION environment variable is required.\n');
    return 1;
  }

  const exportResult = run(
    'pnpm',
    ['exec', 'expo', 'export', '--platform', 'web', '--clear'],
    { cwd, env, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
    runCommand,
  );
  printResult(exportResult, io);
  if (statusOf(exportResult) !== 0) return statusOf(exportResult);

  const deployArgs = ['deploy', '--non-interactive'];
  if (eventName === 'pull_request') {
    if (!prNumber) {
      io.stderr.write('PR number is required for pull_request events.\n');
      return 1;
    }
    deployArgs.push('--alias', `pr-${prNumber}`);
  } else {
    deployArgs.push('--prod');
  }

  const temporaryDirectory = makeTempDirectory(join(tmpdir(), 'betterhabits-eas-deploy-'));
  const logPath = join(temporaryDirectory, 'deploy.log');
  let logDescriptor;
  try {
    logDescriptor = fileSystem.openSync(logPath, 'w');
    const deployResult = run(
      'pnpm',
      ['dlx', `eas-cli@${easCliVersion}`, ...deployArgs],
      { cwd, env, stdio: ['ignore', logDescriptor, logDescriptor] },
      runCommand,
    );
    fileSystem.closeSync(logDescriptor);
    logDescriptor = undefined;

    const deployOutput = fileSystem.readFileSync(logPath, 'utf8');
    io.stderr.write(deployOutput);
    if (statusOf(deployResult) !== 0) return 1;

    const deploymentUrl = valueAfterLabel(deployOutput, 'Deployment URL');
    let deployUrl;
    if (eventName === 'pull_request') {
      deployUrl = valueAfterLabel(deployOutput, 'Alias URL');
    } else {
      deployUrl = deploymentUrl || valueAfterLabel(deployOutput, 'Alias URL');
    }

    io.stdout.write(`${deployUrl}\n${deploymentUrl}\n`);
    return 0;
  } finally {
    if (logDescriptor !== undefined) fileSystem.closeSync(logDescriptor);
    fileSystem.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

export function main(argv = process.argv.slice(2), options = {}) {
  try {
    return exportAndDeployWeb(argv, options);
  } catch (error) {
    (options.io ?? process).stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/.github/scripts/export_and_deploy_web.mjs')) {
  process.exitCode = main();
}
