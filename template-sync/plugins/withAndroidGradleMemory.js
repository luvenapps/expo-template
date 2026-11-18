const { withGradleProperties } = require('@expo/config-plugins');

const MAX_METASPACE_ARGUMENT = '-XX:MaxMetaspaceSize=1024m';

function withAndroidGradleMemory(config) {
  return withGradleProperties(config, (modConfig) => {
    const jvmArgs = modConfig.modResults.find(
      (property) => property.type === 'property' && property.key === 'org.gradle.jvmargs',
    );

    const existingArguments = jvmArgs?.value.split(/\s+/).filter(Boolean) ?? [];
    const updatedArguments = existingArguments.filter(
      (argument) => !argument.startsWith('-XX:MaxMetaspaceSize='),
    );

    if (!updatedArguments.some((argument) => argument.startsWith('-Xmx'))) {
      updatedArguments.unshift('-Xmx2048m');
    }

    updatedArguments.push(MAX_METASPACE_ARGUMENT);

    if (jvmArgs) {
      jvmArgs.value = updatedArguments.join(' ');
    } else {
      modConfig.modResults.push({
        type: 'property',
        key: 'org.gradle.jvmargs',
        value: updatedArguments.join(' '),
      });
    }

    return modConfig;
  });
}

module.exports = withAndroidGradleMemory;
module.exports.MAX_METASPACE_ARGUMENT = MAX_METASPACE_ARGUMENT;
