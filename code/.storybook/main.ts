import type { StorybookConfig } from '@storybook/react-vite';
const config: StorybookConfig = {
  stories: ['../emails/**/*.stories.tsx', '../src/**/*.stories.tsx'],
  framework: '@storybook/react-vite',
  staticDirs: [{ from: '../public/fonts', to: '/fonts' }],
};
export default config;
