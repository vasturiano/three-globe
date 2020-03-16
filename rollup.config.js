import resolve from '@rollup/plugin-node-resolve';
import commonJs from '@rollup/plugin-commonjs';
import babel from 'rollup-plugin-babel';
import json from '@rollup/plugin-json';
import { name, homepage, version } from './package.json';

export default {
  external: ['three'],
  input: 'src/index.js',
  output: [
    {
      format: 'umd',
      name: 'ThreeGlobe',
      globals: { three: 'THREE' },
      file: `dist/${name}.js`,
      sourcemap: true,
      banner: `// Version ${version} ${name} - ${homepage}`
    }
  ],
  plugins: [
    json({ compact: true }),
    resolve(),
    commonJs(),
    babel({ exclude: 'node_modules/**' })
  ]
};