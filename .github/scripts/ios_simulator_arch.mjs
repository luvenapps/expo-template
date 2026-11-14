// Run after EAS prebuild and pod install, in the temporary CI app only.
import { globSync, writeFileSync } from 'node:fs';
import xcode from 'xcode';

const projects = globSync('ios/*.xcodeproj/project.pbxproj');
if (projects.length === 0) throw new Error('No generated iOS app project found');
projects.push('ios/Pods/Pods.xcodeproj/project.pbxproj');

for (const file of projects) {
  const project = xcode.project(file);
  project.parseSync();
  // Limit simulator compilation for both the app and every CocoaPods target.
  project.updateBuildProperty('"ARCHS[sdk=iphonesimulator*]"', 'arm64');
  writeFileSync(file, project.writeSync());
  console.log(`Configured ARM64 simulator compilation: ${file}`);
}
