describe('app entry', () => {
  it('loads the random values polyfill before app modules', () => {
    const loadOrder: string[] = [];

    jest.doMock('react-native-get-random-values', () => {
      loadOrder.push('random values polyfill');
      return {};
    });
    jest.doMock('../src/notifications/firebasePush', () => {
      loadOrder.push('background module');
      return {
        setupBackgroundMessageHandler: () => loadOrder.push('background handler'),
      };
    });
    jest.doMock('expo-router/entry', () => {
      loadOrder.push('expo router');
      return {};
    });

    jest.isolateModules(() => {
      require('../index');
    });

    expect(loadOrder).toEqual([
      'random values polyfill',
      'background module',
      'expo router',
      'background handler',
    ]);
  });
});
