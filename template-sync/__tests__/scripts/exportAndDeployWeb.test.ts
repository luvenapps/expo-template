import { existsSync, mkdtempSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import {
  exportAndDeployWeb as rawExportAndDeployWeb,
  main as rawMain,
} from '../../.github/scripts/export_and_deploy_web.mjs';
import { useCiScriptTestContext } from '../helpers/ciScriptTestContext';

type TestIO = {
  stdout: { write: (text: string) => unknown };
  stderr: { write: (text: string) => unknown };
};
type Environment = Record<string, string | undefined>;
type RunOptions = Record<string, unknown>;
type CommandResult = {
  status?: number | null;
  stdout?: string;
  stderr?: string;
  error?: Error & { code?: string };
};
type RunCommand = (command: string, args: string[], options: RunOptions) => CommandResult;

const exportAndDeployWeb = rawExportAndDeployWeb as (
  argv?: string[],
  options?: {
    env?: Environment;
    cwd?: string;
    io?: TestIO;
    runCommand?: RunCommand;
    makeTempDirectory?: (prefix: string) => string;
  },
) => number;
const main = rawMain as (
  argv?: string[],
  options?: { env?: Environment; io?: TestIO; runCommand?: RunCommand },
) => number;

function io(): TestIO {
  return { stdout: { write: jest.fn() }, stderr: { write: jest.fn() } };
}

describe('web export and deployment', () => {
  const context = useCiScriptTestContext();

  test('runs the real CLI and selects the PR alias URL', () => {
    context.mockCommand(
      'pnpm',
      'if [ "$2" = expo ]; then printf "exported web\\n" >&2; exit 0; fi\nprintf "Deployment URL https://deployment.example\\nAlias URL https://pr.example\\n"',
    );

    const result = context.runScript('export_and_deploy_web.mjs', ['pull_request', '42'], {
      EAS_CLI_VERSION: '18.0.3',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('https://pr.example\nhttps://deployment.example\n');
    expect(result.stderr).toContain('exported web');
    expect(result.stderr).toContain('Alias URL https://pr.example');
  });

  test('uses the production deployment URL and falls back to the alias when needed', () => {
    context.mockCommand(
      'pnpm',
      'if [ "$2" = expo ]; then exit 0; fi\nprintf "Deployment URL https://deployment.example\\nAlias URL https://fallback.example\\n"',
    );
    const production = context.runScript('export_and_deploy_web.mjs', ['push'], {
      EAS_CLI_VERSION: '18.0.3',
    });
    expect(production.status).toBe(0);
    expect(production.stdout).toBe('https://deployment.example\nhttps://deployment.example\n');

    context.mockCommand(
      'pnpm',
      'if [ "$2" = expo ]; then exit 0; fi\nprintf "Alias URL https://fallback.example\\n"',
    );
    const fallback = context.runScript('export_and_deploy_web.mjs', ['push'], {
      EAS_CLI_VERSION: '18.0.3',
    });
    expect(fallback.status).toBe(0);
    expect(fallback.stdout).toBe('https://fallback.example\n\n');
  });

  test('preserves validation, export, and deployment failure exit behavior', () => {
    const usage = context.runScript('export_and_deploy_web.mjs');
    expect(usage.status).toBe(1);
    expect(usage.stderr).toContain('Usage: export_and_deploy_web.mjs');

    const missingVersion = context.runScript('export_and_deploy_web.mjs', ['push'], {
      EAS_CLI_VERSION: '',
    });
    expect(missingVersion.status).toBe(1);
    expect(missingVersion.stderr).toContain('EAS_CLI_VERSION environment variable is required.');

    context.mockCommand('pnpm', 'exit 13');
    const exportFailure = context.runScript('export_and_deploy_web.mjs', ['push'], {
      EAS_CLI_VERSION: '18.0.3',
    });
    expect(exportFailure.status).toBe(13);

    context.mockCommand(
      'pnpm',
      'if [ "$2" = expo ]; then exit 0; fi\nprintf "deploy failed\\n"; exit 9',
    );
    const deployFailure = context.runScript('export_and_deploy_web.mjs', ['push'], {
      EAS_CLI_VERSION: '18.0.3',
    });
    expect(deployFailure.status).toBe(1);
    expect(deployFailure.stderr).toContain('deploy failed');

    context.mockCommand('pnpm', 'exit 0');
    const missingPr = context.runScript('export_and_deploy_web.mjs', ['pull_request'], {
      EAS_CLI_VERSION: '18.0.3',
    });
    expect(missingPr.status).toBe(1);
    expect(missingPr.stderr).toContain('PR number is required');
  });

  test('exports a deploy URL through injected commands and catches thrown command errors', () => {
    const output = io();
    const temporary = mkdtempSync(join(context.root, 'deploy-'));
    let logged = false;
    const runCommand: RunCommand = (_command, args, options) => {
      if (args[1] === 'expo') {
        return {
          status: 0,
          stdout: 'export stdout\n',
          stderr: 'export stderr\n',
          error: Object.assign(new Error('non-fatal spawn warning'), { code: 'EIO' }),
        };
      }
      const [, descriptor] = options.stdio as [string, number, number];
      writeSync(descriptor, 'Deployment URL https://one.example\n');
      logged = true;
      return { status: 0 };
    };
    const result = exportAndDeployWeb(['push'], {
      env: { EAS_CLI_VERSION: '18.0.3' },
      io: output,
      runCommand,
      makeTempDirectory: () => temporary,
    });
    expect(result).toBe(0);
    expect(logged).toBe(true);
    expect(output.stdout.write).toHaveBeenCalledWith('https://one.example\nhttps://one.example\n');
    expect(output.stderr.write).toHaveBeenCalledWith('export stdout\n');
    expect(output.stderr.write).toHaveBeenCalledWith('export stderr\n');
    expect(output.stderr.write).toHaveBeenCalledWith('non-fatal spawn warning\n');
    expect(existsSync(temporary)).toBe(false);

    const absentExport = io();
    expect(
      exportAndDeployWeb(['push'], {
        env: { EAS_CLI_VERSION: '18.0.3' },
        io: absentExport,
        runCommand: () => ({
          status: null,
          error: Object.assign(new Error('pnpm missing'), { code: 'ENOENT' }),
        }),
      }),
    ).toBe(127);
    expect(absentExport.stderr.write).toHaveBeenCalledWith('pnpm missing\n');

    const otherExportError = io();
    expect(
      exportAndDeployWeb(['push'], {
        env: { EAS_CLI_VERSION: '18.0.3' },
        io: otherExportError,
        runCommand: () => ({
          status: null,
          error: Object.assign(new Error('pnpm exec failed'), { code: 'EIO' }),
        }),
      }),
    ).toBe(1);
    expect(otherExportError.stderr.write).toHaveBeenCalledWith('pnpm exec failed\n');

    const failedDeploy = io();
    expect(
      exportAndDeployWeb(['push'], {
        env: { EAS_CLI_VERSION: '18.0.3' },
        io: failedDeploy,
        runCommand: (_command, args, options) => {
          if (args[1] === 'expo') return { status: 0 };
          const [, descriptor] = options.stdio as [string, number, number];
          writeSync(descriptor, 'deployment output without a URL label\n');
          return {
            status: null,
            error: Object.assign(new Error('eas failed'), { code: 'ENOENT' }),
          };
        },
      }),
    ).toBe(1);
    expect(failedDeploy.stdout.write).not.toHaveBeenCalled();
    expect(failedDeploy.stderr.write).toHaveBeenCalledWith(
      'deployment output without a URL label\n',
    );

    const failed = io();
    expect(
      main(['push'], {
        io: failed,
        env: { EAS_CLI_VERSION: '18.0.3' },
        runCommand: () => {
          throw new Error('spawn failed');
        },
      }),
    ).toBe(1);
    expect(failed.stderr.write).toHaveBeenCalledWith('spawn failed\n');
  });

  test('covers usage, missing PR number, and PR alias behavior through the exported runner', () => {
    const output = io();
    expect(exportAndDeployWeb([], { io: output })).toBe(1);
    expect(output.stderr.write).toHaveBeenCalledWith(
      'Usage: export_and_deploy_web.mjs <event_name> [pr_number]\n',
    );

    const missingVersion = io();
    expect(exportAndDeployWeb(['push'], { env: {}, io: missingVersion })).toBe(1);
    expect(missingVersion.stderr.write).toHaveBeenCalledWith(
      'EAS_CLI_VERSION environment variable is required.\n',
    );

    const missingPr = io();
    expect(
      exportAndDeployWeb(['pull_request'], {
        env: { EAS_CLI_VERSION: '18.0.3' },
        io: missingPr,
        runCommand: () => ({ status: 0 }),
      }),
    ).toBe(1);
    expect(missingPr.stderr.write).toHaveBeenCalledWith(
      'PR number is required for pull_request events.\n',
    );

    const prOutput = io();
    expect(
      exportAndDeployWeb(['pull_request', '42'], {
        env: { EAS_CLI_VERSION: '18.0.3' },
        io: prOutput,
        runCommand: (_command, args, options) => {
          if (args[1] === 'expo') return { status: 0 };
          const [, descriptor] = options.stdio as [string, number, number];
          writeSync(descriptor, 'Alias URL https://pr.example\n');
          return { status: 0 };
        },
      }),
    ).toBe(0);
    expect(prOutput.stdout.write).toHaveBeenCalledWith('https://pr.example\n\n');
  });
});
