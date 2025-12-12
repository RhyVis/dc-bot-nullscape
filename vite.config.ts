import { defineConfig } from 'vite';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type PackageJson = {
  dependencies?: Record<string, string>;
};

const pkg = JSON.parse(
  readFileSync(path.join(__dirname, 'package.json'), 'utf-8'),
) as PackageJson;

const dependencyExternals = Object.keys(pkg.dependencies ?? {});
const nodeBuiltins = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]);

export default defineConfig({
  build: {
    target: 'node20',
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true,
    lib: {
      entry: {
        'index': path.resolve(__dirname, 'src/index.ts'),
        'deploy-commands': path.resolve(__dirname, 'src/deploy-commands.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: (source) => {
        if (nodeBuiltins.has(source)) return true;
        if (dependencyExternals.includes(source)) return true;
        return false;
      },
      output: {
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
});
