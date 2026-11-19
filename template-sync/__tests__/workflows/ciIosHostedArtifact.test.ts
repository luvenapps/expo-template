const fs = require('node:fs') as typeof import('node:fs');
const path = require('node:path') as typeof import('node:path');

const workflow = fs.readFileSync(
  path.join(__dirname, '../../.github/workflows/ci-ios-hosted.yml'),
  'utf8',
);

describe('hosted iOS E2E artifact', () => {
  test('uploads the app and Maestro flows inside a tar archive', () => {
    const archiveStep = workflow.indexOf('- name: Archive app and Maestro flows for E2E');
    const uploadStep = workflow.indexOf('- name: Upload app for E2E');
    const nextStep = workflow.indexOf('- name: Upload Xcode build artifacts', uploadStep);
    const uploadBlock = workflow.slice(uploadStep, nextStep);

    expect(archiveStep).toBeGreaterThanOrEqual(0);
    expect(archiveStep).toBeLessThan(uploadStep);
    expect(workflow.slice(archiveStep, uploadStep)).toContain(
      'run: tar -czf ios-e2e-app.tar.gz extracted_app .maestro',
    );
    expect(uploadBlock).toContain('path: ios-e2e-app.tar.gz');
    expect(uploadBlock).not.toContain('extracted_app/');
  });

  test('extracts the app archive before resolving and installing the app', () => {
    const e2eJob = workflow.indexOf('  ios-e2e:');
    const downloadStep = workflow.indexOf('- name: Download app and Maestro flows', e2eJob);
    const extractStep = workflow.indexOf('- name: Extract app and Maestro flows', e2eJob);
    const resolveStep = workflow.indexOf('- name: Resolve app path', e2eJob);
    const installStep = workflow.indexOf('- name: Install app on simulator', e2eJob);

    expect(downloadStep).toBeGreaterThan(e2eJob);
    expect(downloadStep).toBeLessThan(extractStep);
    expect(extractStep).toBeLessThan(resolveStep);
    expect(resolveStep).toBeLessThan(installStep);
    expect(workflow.slice(extractStep, resolveStep)).toContain('run: tar -xzf ios-e2e-app.tar.gz');
  });
});
