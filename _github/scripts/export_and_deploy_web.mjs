#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

function commandStatus(result) {
  if (result.status !== null && result.status !== undefined) return result.status;
  return result.error?.code === 'ENOENT' ? 127 : 1;
}

function printExportOutput(result, io) {
  if (result.stdout) io.stderr.write(result.stdout);
  if (result.stderr) io.stderr.write(result.stderr);
  if (result.error) io.stderr.write(`${result.error.message}\n`);
}

function extractUrl(log, label) {
  const line = log.split(/\r?\n/).find((entry) => new RegExp(`^${label}\\s+`).test(entry));
  return line?.trim().split(/\s+/).at(-1) ?? '';
}

export function exportAndDeployWeb(argv = process.argv.slice(2), options = {}) {
  const env = options.env ?? process.env;
  const io = options.io ?? process;
  const cwd = options.cwd ?? process.cwd();
  const runCommand = options.runCommand ?? spawnSync;
  const EVENT_NAME = argv[0] ?? '';
  const PR_NUMBER = argv[1] ?? '';
  const EAS_CLI_VERSION = env.EAS_CLI_VERSION ?? '';

  if (!EVENT_NAME) {
    io.stderr.write('Usage: export_and_deploy_web.mjs <event_name> [pr_number]\n');
    return 1;
  }

  if (!EAS_CLI_VERSION) {
    io.stderr.write('EAS_CLI_VERSION environment variable is required.\n');
    return 1;
  }

  const exportResult = runCommand('npx', ['expo', 'export', '--platform', 'web', '--clear'], {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  printExportOutput(exportResult, io);
  if (commandStatus(exportResult) !== 0) return commandStatus(exportResult);

  const DEPLOY_ARGS = ['deploy', '--non-interactive'];
  if (EVENT_NAME === 'pull_request') {
    if (!PR_NUMBER) {
      io.stderr.write('PR number is required for pull_request events.\n');
      return 1;
    }
    DEPLOY_ARGS.push('--alias', `pr-${PR_NUMBER}`);
  } else {
    DEPLOY_ARGS.push('--prod');
  }

  const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'eas-deploy-'));
  const LOG_FILE = path.join(temporaryDirectory, 'deploy.log');
  const logFileDescriptor = openSync(LOG_FILE, 'w');
  let deployResult;
  let log;
  try {
    deployResult = runCommand('npx', [`eas-cli@${EAS_CLI_VERSION}`, ...DEPLOY_ARGS], {
      cwd,
      env,
      stdio: ['inherit', logFileDescriptor, logFileDescriptor],
    });
    closeSync(logFileDescriptor);
    log = readFileSync(LOG_FILE, 'utf8');
    if (deployResult.error) log += `${deployResult.error.message}\n`;
    if (log) io.stderr.write(log);

    if (commandStatus(deployResult) !== 0) return 1;
  } finally {
    try {
      closeSync(logFileDescriptor);
    } catch {}
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }

  const DEPLOYMENT_URL = extractUrl(log, 'Deployment URL');
  let DEPLOY_URL;
  if (EVENT_NAME === 'pull_request') {
    DEPLOY_URL = extractUrl(log, 'Alias URL');
  } else {
    DEPLOY_URL = DEPLOYMENT_URL || extractUrl(log, 'Alias URL');
  }

  io.stdout.write(`${DEPLOY_URL}\n`);
  io.stdout.write(`${DEPLOYMENT_URL}\n`);
  return 0;
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
