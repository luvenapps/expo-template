import React from 'react';
import { Text as RNText, View as RNView } from 'react-native';

// Mock Tamagui functions
export const createTokens = jest.fn((tokens) => tokens);
export const createFont = jest.fn((font) => font);
export const createTamagui = jest.fn((config) => config);

// Mock TamaguiProvider
export const TamaguiProvider = ({ children }: any) => {
  return React.createElement(RNView, {}, children);
};

// Mock Tamagui layout components
export const YStack = ({ children, testID = 'ystack', ...props }: any) => {
  return React.createElement(RNView, { testID, ...props }, children);
};

export const XStack = ({ children, testID = 'xstack', ...props }: any) => {
  return React.createElement(RNView, { testID, ...props }, children);
};

// Mock Tamagui text components - render as React Native Text
export const Paragraph = ({ children, testID = 'paragraph', ...props }: any) => {
  return React.createElement(RNText, { testID, ...props }, children);
};

export const Text = ({ children, testID = 'text', ...props }: any) => {
  return React.createElement(RNText, { testID, ...props }, children);
};

export const H1 = ({ children, testID = 'h1', ...props }: any) => {
  return React.createElement(RNText, { testID, ...props }, children);
};

export const H2 = ({ children, testID = 'h2', ...props }: any) => {
  return React.createElement(RNText, { testID, ...props }, children);
};

export const H3 = ({ children, testID = 'h3', ...props }: any) => {
  return React.createElement(RNText, { testID, ...props }, children);
};

export const H4 = ({ children, testID = 'h4', ...props }: any) => {
  return React.createElement(RNText, { testID, ...props }, children);
};

export const H5 = ({ children, testID = 'h5', ...props }: any) => {
  return React.createElement(RNText, { testID, ...props }, children);
};

export const H6 = ({ children, testID = 'h6', ...props }: any) => {
  return React.createElement(RNText, { testID, ...props }, children);
};

// Mock Button - render as View with Text child
export const Button = ({ children, testID = 'button', ...props }: any) => {
  return React.createElement(
    RNView,
    { testID, ...props },
    typeof children === 'string' ? React.createElement(RNText, {}, children) : children,
  );
};
