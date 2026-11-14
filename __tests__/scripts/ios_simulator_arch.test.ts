/** @jest-environment node */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { scripts, useCiScriptTestContext } from '../helpers/ciScriptTestContext';

describe('ios_simulator_arch', () => {
  const context = useCiScriptTestContext();

  test('limits the app and CocoaPods simulator architectures while preserving device settings', () => {
    const projects = ['ios/Example.xcodeproj', 'ios/Pods/Pods.xcodeproj'];
    for (const project of projects) {
      mkdirSync(join(context.root, project), { recursive: true });
      writeFileSync(
        join(context.root, project, 'project.pbxproj'),
        `// !$*UTF8*$!
{
  archiveVersion = 1;
  classes = {};
  objectVersion = 46;
  objects = {
/* Begin XCBuildConfiguration section */
    A00000000000000000000001 /* Release */ = {
      isa = XCBuildConfiguration;
      buildSettings = {
        ARCHS = "$(ARCHS_STANDARD)";
        "ARCHS[sdk=iphoneos*]" = arm64;
        PRODUCT_NAME = Example;
      };
      name = Release;
    };
/* End XCBuildConfiguration section */
  };
  rootObject = A00000000000000000000001;
}
`,
      );
    }
    const command = [process.execPath, join(scripts, 'ios_simulator_arch.mjs')];
    expect(context.run(command).status).toBe(0);
    for (const project of projects) {
      const contents = context.read(`${project}/project.pbxproj`);
      expect(contents).toContain('"ARCHS[sdk=iphonesimulator*]" = arm64;');
      expect(contents).toContain('"ARCHS[sdk=iphoneos*]" = arm64;');
      expect(contents).toContain('ARCHS = "$(ARCHS_STANDARD)";');
      expect(contents).toContain('PRODUCT_NAME = Example;');
    }
    const first = context.read(`${projects[0]}/project.pbxproj`);
    expect(context.run(command).status).toBe(0);
    expect(context.read(`${projects[0]}/project.pbxproj`)).toBe(first);
  });

  test('fails when the native app has not been generated yet', () => {
    expect(
      context.run([process.execPath, join(scripts, 'ios_simulator_arch.mjs')]).status,
    ).not.toBe(0);
  });
});
