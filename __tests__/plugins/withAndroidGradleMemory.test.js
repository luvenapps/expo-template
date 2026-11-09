jest.mock('@expo/config-plugins', () => ({
  withGradleProperties: jest.fn((config, action) => action(config)),
}));

const { it } = require('@jest/globals');
const withAndroidGradleMemory = require('../../plugins/withAndroidGradleMemory');
const { MAX_METASPACE_ARGUMENT } = require('../../plugins/withAndroidGradleMemory');

describe('withAndroidGradleMemory', () => {
  it('raises Gradle Metaspace while preserving other JVM arguments', () => {
    const config = {
      modResults: [
        {
          type: 'property',
          key: 'org.gradle.jvmargs',
          value: '-Xmx2048m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8',
        },
      ],
    };

    withAndroidGradleMemory(config);

    expect(config.modResults[0].value).toBe(
      `-Xmx2048m -Dfile.encoding=UTF-8 ${MAX_METASPACE_ARGUMENT}`,
    );
  });

  it('adds the Gradle JVM arguments when the property is missing', () => {
    const config = { modResults: [{ type: 'empty' }] };

    withAndroidGradleMemory(config);

    expect(config.modResults).toContainEqual({
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: `-Xmx2048m ${MAX_METASPACE_ARGUMENT}`,
    });
  });
});
