import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';

export default defineConfig({
  plugins: [pluginReact()],
  output: {
    assetPrefix: process.env['ASSET_PREFIX'] ?? 'http://localhost/remotes/pipeline/',
  },
  tools: {
    rspack: {
      plugins: [
        new ModuleFederationPlugin({
          name: 'pipeline',
          exposes: {
            './App': './src/App.tsx',
          },
          shared: {
            react: { singleton: true, requiredVersion: '^18.3.1' },
            'react-dom': { singleton: true, requiredVersion: '^18.3.1' },
            'react-router-dom': { singleton: true, requiredVersion: '^7.1.1' },
          },
        }),
      ],
    },
  },
  source: {
    entry: { index: './src/index.tsx' },
  },
  server: {
    port: 5002,
  },
});
