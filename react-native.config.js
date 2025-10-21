// react-native.config.js
// Disable autolinking for packages that come with their own New Architecture linking setup
module.exports = {
  dependencies: {
    'react-native-reanimated': {
      platforms: {
        android: {
          libraryName: null,
          componentDescriptors: null,
          cmakeListsPath: null,
          cxxModuleCMakeListsModuleName: null,
          cxxModuleCMakeListsPath: null,
          cxxModuleHeaderName: null,
        },
      },
    },
    'react-native-screens': {
      platforms: {
        android: {
          libraryName: null,
          componentDescriptors: null,
          cmakeListsPath: null,
          cxxModuleCMakeListsModuleName: null,
          cxxModuleCMakeListsPath: null,
          cxxModuleHeaderName: null,
        },
      },
    },
    'react-native-safe-area-context': {
      platforms: {
        android: {
          libraryName: null,
          componentDescriptors: null,
          cmakeListsPath: null,
          cxxModuleCMakeListsModuleName: null,
          cxxModuleCMakeListsPath: null,
          cxxModuleHeaderName: null,
        },
      },
    },
    'react-native-gesture-handler': {
      platforms: {
        android: {
          libraryName: null,
          componentDescriptors: null,
          cmakeListsPath: null,
          cxxModuleCMakeListsModuleName: null,
          cxxModuleCMakeListsPath: null,
          cxxModuleHeaderName: null,
        },
      },
    },
  },
};
