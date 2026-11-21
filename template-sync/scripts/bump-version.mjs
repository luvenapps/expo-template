#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import semver from 'semver';
import ts from 'typescript';

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error('Could not read ' + path.basename(filePath) + ': ' + error.message);
  }
}

function getStaticPropertyName(name) {
  return name && ts.isIdentifier(name) ? name.text : undefined;
}

function getUniqueProperty(object, name, owner) {
  const matches = object.properties.filter(
    (property) => getStaticPropertyName(property.name) === name,
  );

  if (matches.length !== 1 || !ts.isPropertyAssignment(matches[0])) {
    throw new Error('Expected exactly one "' + name + '" property in ' + owner + '.');
  }

  return matches[0];
}

function getObjectInitializer(property, owner) {
  if (!ts.isObjectLiteralExpression(property.initializer)) {
    throw new Error(owner + ' must be a static object literal.');
  }

  return property.initializer;
}

function getLiteralInitializer(property, owner, requiredType) {
  const initializer = property.initializer;
  const isString = ts.isStringLiteral(initializer);
  const isNumber = ts.isNumericLiteral(initializer);
  const hasExpectedType = requiredType === 'string' ? isString : isNumber;

  if ((!isString && !isNumber) || !hasExpectedType) {
    throw new Error(owner + ' must be a static ' + requiredType + ' literal.');
  }

  return initializer;
}

function readBuildNumber(literal, owner) {
  const value = Number(literal.text);

  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(owner + ' must be a non-negative integer literal.');
  }

  return value;
}

function createLiteralEdit(literal, value, sourceFile) {
  const raw = literal.getText(sourceFile);
  const replacement = ts.isStringLiteral(literal) ? raw[0] + String(value) + raw[0] : String(value);

  return {
    start: literal.getStart(sourceFile),
    end: literal.getEnd(),
    replacement,
  };
}

function findAppConfigObject(sourceFile) {
  const exports = sourceFile.statements.filter(ts.isExportAssignment);

  if (
    exports.length !== 1 ||
    exports[0].isExportEquals ||
    !ts.isArrowFunction(exports[0].expression) ||
    !ts.isBlock(exports[0].expression.body)
  ) {
    throw new Error('app.config.ts must default-export one config function with a block body.');
  }

  const returns = exports[0].expression.body.statements.filter(ts.isReturnStatement);

  if (
    returns.length !== 1 ||
    !returns[0].expression ||
    !ts.isObjectLiteralExpression(returns[0].expression)
  ) {
    throw new Error('app.config.ts config function must return one static object literal.');
  }

  return returns[0].expression;
}

function updateAppConfig(source, nextVersion) {
  const sourceFile = ts.createSourceFile(
    'app.config.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  if (sourceFile.parseDiagnostics.length > 0) {
    throw new Error('app.config.ts contains invalid TypeScript syntax.');
  }

  const config = findAppConfigObject(sourceFile);
  const version = getLiteralInitializer(
    getUniqueProperty(config, 'version', 'app.config.ts config object'),
    'app.config.ts version',
    'string',
  );
  const ios = getObjectInitializer(
    getUniqueProperty(config, 'ios', 'app.config.ts config object'),
    'app.config.ts ios',
  );
  const android = getObjectInitializer(
    getUniqueProperty(config, 'android', 'app.config.ts config object'),
    'app.config.ts android',
  );
  const buildNumber = getLiteralInitializer(
    getUniqueProperty(ios, 'buildNumber', 'app.config.ts ios object'),
    'app.config.ts ios.buildNumber',
    'string',
  );
  const versionCode = getLiteralInitializer(
    getUniqueProperty(android, 'versionCode', 'app.config.ts android object'),
    'app.config.ts android.versionCode',
    'number',
  );
  const nextBuildNumber = readBuildNumber(buildNumber, 'app.config.ts ios.buildNumber') + 1;
  const nextVersionCode = readBuildNumber(versionCode, 'app.config.ts android.versionCode') + 1;
  const edits = [
    createLiteralEdit(version, nextVersion, sourceFile),
    createLiteralEdit(buildNumber, nextBuildNumber, sourceFile),
    createLiteralEdit(versionCode, nextVersionCode, sourceFile),
  ].sort((left, right) => right.start - left.start);

  let updatedSource = source;
  for (const edit of edits) {
    updatedSource =
      updatedSource.slice(0, edit.start) + edit.replacement + updatedSource.slice(edit.end);
  }

  return {
    content: updatedSource,
    nextBuildNumber: String(nextBuildNumber),
    nextVersionCode,
  };
}

function parseArguments(args) {
  let releaseType = 'patch';
  let explicitVersion;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--type') {
      releaseType = args[index + 1] ?? releaseType;
      index += 1;
    } else if (argument === '--set') {
      explicitVersion = args[index + 1];
      index += 1;
    }
  }

  return { releaseType, explicitVersion };
}

export function bumpVersion({ args = [], cwd = process.cwd() } = {}) {
  const packagePath = path.resolve(cwd, 'package.json');
  const appConfigPath = path.resolve(cwd, 'app.config.ts');
  let packageJson;

  try {
    packageJson = JSON.parse(readFile(packagePath));
  } catch (error) {
    throw new Error('Could not parse package.json: ' + error.message);
  }

  if (!packageJson || typeof packageJson.version !== 'string') {
    throw new Error('package.json must contain a string version.');
  }

  const appConfigSource = readFile(appConfigPath);
  const { releaseType, explicitVersion } = parseArguments(args);
  const currentVersion = packageJson.version;
  const nextVersion =
    explicitVersion !== undefined
      ? semver.valid(explicitVersion)
      : semver.inc(currentVersion, releaseType);

  if (!nextVersion) {
    throw new Error(
      'Unable to compute next version. Current: ' +
        currentVersion +
        ', releaseType: ' +
        releaseType +
        ', explicit: ' +
        (explicitVersion ?? 'n/a'),
    );
  }

  const appConfig = updateAppConfig(appConfigSource, nextVersion);
  packageJson.version = nextVersion;

  // Validate both output documents before writing either file.
  const packageOutput = JSON.stringify(packageJson, null, 2) + '\n';
  fs.writeFileSync(packagePath, packageOutput);
  fs.writeFileSync(appConfigPath, appConfig.content);

  return {
    currentVersion,
    nextVersion,
    nextBuildNumber: appConfig.nextBuildNumber,
    nextVersionCode: appConfig.nextVersionCode,
  };
}

export function main({
  args = process.argv.slice(2),
  cwd = process.cwd(),
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const result = bumpVersion({ args, cwd });
    stdout.write('[version-bump] Updated files:\n');
    stdout.write('  package.json -> ' + result.currentVersion + ' → ' + result.nextVersion + '\n');
    stdout.write('  app.config.ts ios.buildNumber -> ' + result.nextBuildNumber + '\n');
    stdout.write('  app.config.ts android.versionCode -> ' + result.nextVersionCode + '\n');
    return 0;
  } catch (error) {
    stderr.write('[version-bump] ' + error.message + '\n');
    return 1;
  }
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

/* istanbul ignore if -- direct execution is covered by the CLI integration test. */
if (isDirectExecution) {
  process.exitCode = main();
}
