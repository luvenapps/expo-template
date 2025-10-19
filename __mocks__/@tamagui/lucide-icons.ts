import React from 'react';

export const Home = ({ size, color, ...props }: any) =>
  React.createElement('HomeIcon', {
    testID: 'home-icon',
    size,
    color,
    ...props,
  });

export const Settings = ({ size, color, ...props }: any) =>
  React.createElement('SettingsIcon', {
    testID: 'settings-icon',
    size,
    color,
    ...props,
  });
