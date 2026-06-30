import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const circleDir = fileURLToPath(new URL('.', import.meta.url));
const monorepoRoot = path.resolve(circleDir, '../..');
const pkg = JSON.parse(readFileSync(path.join(circleDir, 'package.json'), 'utf-8')) as {
  version: string;
};

const circleBuildId = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

function readGitShortSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: monorepoRoot,
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'local';
  }
}

const circleGitSha = readGitShortSha();

export default defineConfig({
  define: {
    __CIRCLE_BUILD_ID__: JSON.stringify(circleBuildId),
    __CIRCLE_APP_VERSION__: JSON.stringify(pkg.version),
    __CIRCLE_GIT_SHA__: JSON.stringify(circleGitSha),
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'circle-html-build-stamp',
      transformIndexHtml(html) {
        return html
          .replace(
            '<html lang="en">',
            `<html lang="en" data-circle-build="${circleBuildId}">`,
          )
          .replace(
            '<title>MedXForce Circle</title>',
            `<title>MedXForce Circle</title>\n    <!-- circle-build:${circleBuildId} circle-version:${pkg.version} circle-git:${circleGitSha} -->`,
          );
      },
    },
  ],
  resolve: {
    alias: {
      '@medxforce/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('recharts')) return 'recharts';
          if (id.includes('/motion/') || id.includes('node_modules/motion')) return 'motion';
        },
      },
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api/visit-capture': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/address-search': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
