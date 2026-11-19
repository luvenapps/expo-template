import {
  main as rawMain,
  mapRuntimeEnvironment as rawMapRuntimeEnvironment,
} from '../../.github/scripts/map_runtime_env.mjs';
import { useCiScriptTestContext } from '../helpers/ciScriptTestContext';

type Environment = Record<string, string | undefined>;
type TestIO = {
  stdout: { write: (text: string) => unknown };
  stderr: { write: (text: string) => unknown };
};

const mapRuntimeEnvironment = rawMapRuntimeEnvironment as (options?: {
  env?: Environment;
  appendFile?: (path: string, data: string) => void;
}) => void;
const main = rawMain as (options?: { env?: Environment; io?: TestIO }) => number;

describe('map runtime environment', () => {
  const context = useCiScriptTestContext();

  test('writes the workflow variables in order and defaults optional Firebase values to empty', () => {
    const env = {
      GITHUB_ENV: `${context.root}/github-env.txt`,
      TURN_ON_FIREBASE: 'true',
      RETRIES_VALUE: '3',
      RETRY_DELAY_VALUE: '2',
      PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      PUBLIC_SUPABASE_ANON_KEY: 'anon',
      SUPABASE_ACCESS_TOKEN_VALUE: 'token',
      FIREBASE_API_KEY: 'api-key',
    };

    mapRuntimeEnvironment({ env });

    expect(context.read('github-env.txt').split('\n')).toEqual([
      'EXPO_PUBLIC_TURN_ON_FIREBASE=true',
      'RETRIES=3',
      'RETRY_DELAY=2',
      'EXPO_PUBLIC_FIREBASE_API_KEY=api-key',
      'EXPO_PUBLIC_FIREBASE_APP_ID=',
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=',
      'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=',
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=',
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID=',
      'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=',
      'EXPO_PUBLIC_FIREBASE_VAPID_KEY=',
      'EXPO_PUBLIC_SUPABASE_URL=https://example.supabase.co',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY=anon',
      'SUPABASE_ACCESS_TOKEN=token',
    ]);
  });

  test('keeps partial output and reports missing required values', () => {
    const githubEnvironment = `${context.root}/partial-env.txt`;
    const env = {
      GITHUB_ENV: githubEnvironment,
      TURN_ON_FIREBASE: 'false',
      RETRIES_VALUE: '2',
      RETRY_DELAY_VALUE: '0',
    };
    const io = { stdout: { write: jest.fn() }, stderr: { write: jest.fn() } };

    expect(main({ env, io })).toBe(1);
    const partialOutput = context.read('partial-env.txt');
    expect(partialOutput).toContain('EXPO_PUBLIC_TURN_ON_FIREBASE=false');
    expect(partialOutput).toContain('RETRIES=2');
    expect(partialOutput).toContain('RETRY_DELAY=0');
    expect(partialOutput).toContain('EXPO_PUBLIC_FIREBASE_VAPID_KEY=');
    expect(io.stderr.write).toHaveBeenCalledWith('PUBLIC_SUPABASE_URL: unbound variable\n');
  });

  test('reports missing GITHUB_ENV before attempting to append', () => {
    const appendFile = jest.fn();
    expect(() => mapRuntimeEnvironment({ env: {}, appendFile })).toThrow('GITHUB_ENV is required');
    expect(appendFile).not.toHaveBeenCalled();
  });

  test('uses process environment defaults and runs the MJS entrypoint', () => {
    const environment = {
      GITHUB_ENV: `${context.root}/default-env.txt`,
      TURN_ON_FIREBASE: 'true',
      RETRIES_VALUE: '1',
      RETRY_DELAY_VALUE: '0',
      PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      PUBLIC_SUPABASE_ANON_KEY: 'anon',
      SUPABASE_ACCESS_TOKEN_VALUE: 'token',
    };
    const previous = Object.fromEntries(
      Object.keys(environment).map((key) => [key, process.env[key]]),
    );

    try {
      Object.assign(process.env, environment);
      expect(mapRuntimeEnvironment()).toBeUndefined();
      expect(main()).toBe(0);
      expect(context.read('default-env.txt')).toContain('EXPO_PUBLIC_TURN_ON_FIREBASE=true');

      const cli = context.runScript('map_runtime_env.mjs', [], environment);
      expect(cli.status).toBe(0);
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
import process from 'node:process';
