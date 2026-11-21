import * as fs from 'node:fs';
import * as path from 'node:path';

const workflowsDirectory = path.resolve(
  process.cwd(),
  'template-sync/_github/workflows',
);
const miseCiConfigPath = path.resolve(
  process.cwd(),
  'template-sync/_mise.ci.toml',
);

describe('template CI mise config', () => {
  test('provides version variables needed by generated app workflows', () => {
    const workflowFiles = fs.existsSync(workflowsDirectory)
      ? fs
          .readdirSync(workflowsDirectory)
          .filter((file) => /\.ya?ml$/.test(file))
      : [];
    const workflowContents = workflowFiles
      .map((file) =>
        fs.readFileSync(path.join(workflowsDirectory, file), 'utf8'),
      )
      .join('\n');
    const referencedVariables = new Set([
      ...[
        ...workflowContents.matchAll(/\$(?:\{)?([A-Z][A-Z0-9_]*_VERSION)\b/g),
      ].map((match) => match[1]),
      ...[
        ...workflowContents.matchAll(
          /\$\{\{\s*env\.([A-Z][A-Z0-9_]*_VERSION)\s*\}\}/g,
        ),
      ].map((match) => match[1]),
    ]);
    const workflowDefinedVariables = new Set([
      ...[
        ...workflowContents.matchAll(
          /(?:^|\n)\s*(?:export\s+)?([A-Z][A-Z0-9_]*_VERSION)\s*(?:=|:)/g,
        ),
      ].map((match) => match[1]),
      ...[
        ...workflowContents.matchAll(
          /echo\s+[\"']?([A-Z][A-Z0-9_]*_VERSION)=/g,
        ),
      ].map((match) => match[1]),
    ]);
    const config = fs.existsSync(miseCiConfigPath)
      ? fs.readFileSync(miseCiConfigPath, 'utf8')
      : '';
    const configEnvKeys = new Set<string>();
    let inEnvSection = false;
    for (const line of config.split('\n')) {
      const section = line.match(/^\s*\[([^\]]+)\]\s*$/);
      if (section) {
        inEnvSection = section[1] === 'env';
        continue;
      }
      if (inEnvSection) {
        const key = line.match(/^\s*([A-Z][A-Z0-9_]*_VERSION)\s*=/);
        if (key) configEnvKeys.add(key[1]);
      }
    }
    const missingVariables = [...referencedVariables].filter(
      (variable) =>
        !workflowDefinedVariables.has(variable) && !configEnvKeys.has(variable),
    );

    expect(missingVariables).toEqual([]);
  });
});
