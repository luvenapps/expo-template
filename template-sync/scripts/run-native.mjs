#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const [platform, ...inputArgs] = process.argv.slice(2);

if (platform !== 'ios' && platform !== 'android') {
  console.error('Usage: npm run <ios|android> [-- --debug] [--device <id>]');
  process.exit(2);
}

const debugMode = inputArgs.includes('--debug');
const expoArgs = inputArgs.filter((arg) => arg !== '--debug');

function getDeviceSelector(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith('--device=')) {
      const value = arg.slice('--device='.length);
      if (value) return value;
      throw new Error('Pass a device ID after --device.');
    }
    if (arg === '--device') {
      const value = args[index + 1];
      return value && !value.startsWith('-') ? value : true;
    }
  }
  return undefined;
}

function capture(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = result.stderr?.trim();
    throw new Error(details || `${command} ${args.join(' ')} failed.`);
  }
  return result.stdout;
}

function run(command, args, { captureOutput = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: captureOutput ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    });
    let stdout = '';
    let stderr = '';

    if (captureOutput) {
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
        process.stdout.write(chunk);
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
        process.stderr.write(chunk);
      });
    }

    child.once('error', reject);
    child.once('close', (code, signal) => {
      resolve({
        status: code ?? (signal ? 1 : 0),
        installedAppPath: captureOutput ? findInstalledAppPath(`${stdout}\n${stderr}`) : undefined,
      });
    });
  });
}

function findInstalledAppPath(output) {
  const line = output
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .split(/\r?\n/)
    .find((item) => item.includes('Installing ') && item.includes('.app'));
  if (!line) return undefined;

  const path = line.slice(line.indexOf('Installing ') + 'Installing '.length).trim();
  return path.match(/^(.+?\.app)(?:\s|$)/)?.[1];
}

function isCommandAvailable(command) {
  return !spawnSync(command, ['--version'], { stdio: 'ignore' }).error;
}

function isLegacyIosDevice(target) {
  const majorVersion = Number.parseInt(target.osVersion?.split('.')[0] ?? '', 10);
  return target.kind === 'device' && Number.isInteger(majorVersion) && majorVersion < 17;
}

function runChecked(command, args) {
  const status = spawnSync(command, args, { stdio: 'inherit' });
  if (status.error) throw status.error;
  if (status.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed.`);
  }
}

async function selectIosTarget(selector) {
  // Reuse Expo's resolver so --debug shows the same interactive device list as Expo CLI.
  const {
    resolveDeviceAsync,
    isSimulatorDevice,
  } = require('@expo/cli/build/src/run/ios/options/resolveDevice.js');
  const device = await resolveDeviceAsync(selector ?? true, { osType: 'iOS' });
  return {
    id: device.udid,
    expoSelector: device.udid,
    devicectlSelector: device.name,
    osVersion: device.osVersion,
    kind: isSimulatorDevice(device) ? 'simulator' : 'device',
    label: device.name,
  };
}

async function selectAndroidTarget(selector) {
  if (selector === undefined || selector === true) {
    // This is Expo's existing autocomplete picker for emulators and connected devices.
    const { resolveDeviceAsync } = require('@expo/cli/build/src/run/android/resolveDevice.js');
    const manager = await resolveDeviceAsync(true);
    return {
      id: manager.device.pid,
      expoSelector: manager.device.name,
      kind: 'android',
      label: manager.device.name,
    };
  }

  // Expo accepts a device name. Also allow the adb serial shown by `adb devices -l`.
  const { getDevicesAsync } = require('@expo/cli/build/src/start/platforms/android/getDevices.js');
  const {
    AndroidDeviceManager,
  } = require('@expo/cli/build/src/start/platforms/android/AndroidDeviceManager.js');
  const devices = await getDevicesAsync();
  const selected = devices.find(
    (device) => device.pid === selector || device.name.toLowerCase() === selector.toLowerCase(),
  );
  if (!selected) {
    throw new Error(`No Android emulator or device matches "${selector}".`);
  }
  const manager = await AndroidDeviceManager.resolveAsync({
    device: selected,
    shouldPrompt: false,
  });
  return {
    id: manager.device.pid,
    expoSelector: manager.device.name,
    kind: 'android',
    label: manager.device.name,
  };
}

function setDeviceSelector(args, id) {
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--device') {
      const next = args[index + 1];
      if (!next || next.startsWith('-')) {
        args.splice(index, 1, '--device', id);
      } else {
        args[index + 1] = id;
      }
      return;
    }
    if (args[index].startsWith('--device=')) {
      args[index] = `--device=${id}`;
      return;
    }
  }
  args.push('--device', id);
}

function getAppIdentifier() {
  const config = JSON.parse(capture('expo', ['config', '--json']));
  const identifier = platform === 'ios' ? config.ios?.bundleIdentifier : config.android?.package;
  if (!identifier) {
    throw new Error(`Expo config does not define an ${platform} app identifier.`);
  }
  return identifier;
}

async function main() {
  if (!debugMode) {
    const { status } = await run('expo', [`run:${platform}`, '--no-bundler', ...expoArgs]);
    process.exitCode = status;
    return;
  }

  const selector = getDeviceSelector(expoArgs);
  const target =
    platform === 'ios' ? await selectIosTarget(selector) : await selectAndroidTarget(selector);
  const useIosDeploy = platform === 'ios' && isLegacyIosDevice(target);
  if (useIosDeploy && !isCommandAvailable('ios-deploy')) {
    throw new Error(
      `iOS ${target.osVersion} devices need ios-deploy to launch with Firebase Analytics debug mode. Install it once with "brew install ios-deploy", then retry.`,
    );
  }

  setDeviceSelector(expoArgs, target.expoSelector ?? target.id);
  const appIdentifier = getAppIdentifier();

  if (platform === 'android') {
    console.log(`Enabling Firebase Analytics DebugView on Android target ${target.label}.`);
    runChecked('adb', [
      '-s',
      target.id,
      'shell',
      'setprop',
      'debug.firebase.analytics.app',
      appIdentifier,
    ]);
  }

  const expoResult = await run('expo', [`run:${platform}`, '--no-bundler', ...expoArgs], {
    captureOutput: useIosDeploy,
  });
  if (expoResult.status !== 0) {
    process.exitCode = expoResult.status;
    return;
  }

  if (platform === 'ios') {
    console.log(`Enabling Firebase Analytics DebugView on iOS ${target.kind} ${target.label}.`);
    if (target.kind === 'simulator') {
      runChecked('xcrun', [
        'simctl',
        'launch',
        '--terminate-running-process',
        target.id,
        appIdentifier,
        '-FIRDebugEnabled',
      ]);
    } else if (useIosDeploy) {
      if (!expoResult.installedAppPath) {
        throw new Error('Could not find the built .app path in Expo output for ios-deploy.');
      }
      console.log(`Launching with Firebase Analytics DebugView on iOS ${target.osVersion} device.`);
      runChecked('ios-deploy', [
        '--id',
        target.id,
        '--bundle',
        expoResult.installedAppPath,
        '--debug',
        '--justlaunch',
        '--args=-FIRDebugEnabled',
      ]);
    } else {
      runChecked('xcrun', [
        'devicectl',
        'device',
        'process',
        'launch',
        '--terminate-existing',
        '--device',
        target.devicectlSelector ?? target.id,
        appIdentifier,
        '--',
        '-FIRDebugEnabled',
      ]);
    }
    return;
  }

  runChecked('adb', ['-s', target.id, 'shell', 'am', 'force-stop', appIdentifier]);
  runChecked('adb', ['-s', target.id, 'shell', 'monkey', '-p', appIdentifier, '1']);
}

main().catch((error) => {
  console.error(`Firebase debug launch failed: ${error.message}`);
  process.exitCode = 1;
});
