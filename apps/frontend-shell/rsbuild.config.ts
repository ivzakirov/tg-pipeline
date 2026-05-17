import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';

export default defineConfig({
  plugins: [pluginReact()],
  tools: {
    rspack: {
      plugins: [
        new ModuleFederationPlugin({
          name: 'shell',
          remotes: {
            viewer: `viewer@${process.env['VIEWER_URL'] ?? 'http://localhost/remotes/viewer'}/mf-manifest.json`,
            pipeline: `pipeline@${process.env['PIPELINE_URL'] ?? 'http://localhost/remotes/pipeline'}/mf-manifest.json`,
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
    port: 5000,
  },
});
