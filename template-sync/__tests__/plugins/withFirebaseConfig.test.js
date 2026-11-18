jest.mock('expo/config-plugins', () => ({
  withPlugins: jest.fn((config) => config),
}));

const { withPlugins } = require('expo/config-plugins');
const withFirebaseConfig = require('../../plugins/withFirebaseConfig');

describe('withFirebaseConfig', () => {
  test('adds native Firebase config and plugins', () => {
    const config = {};

    const result = withFirebaseConfig(config);

    expect(withPlugins).toHaveBeenCalledWith(config, [
      [
        '@react-native-firebase/app',
        {
          ios: { googleServicesFile: './credentials/GoogleService-Info.plist' },
          android: { googleServicesFile: './credentials/google-services.json' },
        },
      ],
      '@react-native-firebase/crashlytics',
    ]);
    expect(result).toEqual({
      ios: { googleServicesFile: './credentials/GoogleService-Info.plist' },
      android: { googleServicesFile: './credentials/google-services.json' },
    });
  });
});
