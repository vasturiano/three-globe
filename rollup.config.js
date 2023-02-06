import resolve from '@rollup/plugin-node-resolve';
import commonJs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';
import terser from "@rollup/plugin-terser";
import dts from 'rollup-plugin-dts';

import pkg from './package.json' assert { type: 'json' };
const { name, homepage, version, dependencies, peerDependencies } = pkg;

const umdConf = {
  format: 'umd',
  name: 'ThreeGlobe',
  globals: { three: 'THREE' },
  banner: `// Version ${version} ${name} - ${homepage}`
};
export default [
  {
    external: ['three'],
    input: 'src/index.js',
    output: [
      {
        ...umdConf,
        file: `dist/${name}.js`,
        sourcemap: true,
      },
      { // minify
        ...umdConf,
        file: `dist/${name}.min.js`,
        plugins: [terser({
          output: { comments: '/Version/' }
        })]
      }
    ],
    plugins: [
      json({ compact: true }),
      resolve(),
      commonJs(),
      babel({ exclude: 'node_modules/**', babelHelpers: "bundled" })
    ]
  },
  { // ES module
    input: 'src/index.js',
    output: [
      {
        format: 'es',
        file: `dist/${name}.mjs`
      }
    ],
    external: [...Object.keys(dependencies), ...Object.keys(peerDependencies)],
    plugins: [
      json({ compact: true }),
      babel({ babelHelpers: "bundled" })
    ]
  },
  { // expose TS declarations
    input: 'src/index.d.ts',
    output: [{
      file: `dist/${name}.d.ts`,
      format: 'es'
    }],
    plugins: [dts()]
  }
];