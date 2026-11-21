// Run after EAS prebuild and pod install, in the temporary CI app only.
import { globSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const appRoot = process.env.INIT_CWD || process.env.PWD || process.cwd();
const requireFromApp = createRequire(resolve(appRoot, 'package.json'));
let xcode;
try {
  xcode = requireFromApp('xcode');
} catch (error) {
  if (error?.code !== 'MODULE_NOT_FOUND') throw error;
  // pnpm keeps xcode nested under Expo config plugins, not at the app root.
  const requireFromExpoCli = createRequire(requireFromApp.resolve('@expo/cli'));
  const configPluginsPath = requireFromExpoCli.resolve('@expo/config-plugins');
  xcode = createRequire(configPluginsPath)('xcode');
}

const projects = globSync('ios/*.xcodeproj/project.pbxproj');
if (projects.length === 0)
  throw new Error('No generated iOS app project found');
projects.push('ios/Pods/Pods.xcodeproj/project.pbxproj');

for (const file of projects) {
  const project = xcode.project(file);
  project.parseSync();
  // Limit simulator compilation for both the app and every CocoaPods target.
  project.updateBuildProperty('"ARCHS[sdk=iphonesimulator*]"', 'arm64');
  writeFileSync(file, project.writeSync());
  console.log(`Configured ARM64 simulator compilation: ${file}`);
}
