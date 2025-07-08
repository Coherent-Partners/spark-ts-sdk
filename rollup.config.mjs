import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';

// Browser-friendly UMD build.
const bundle = { format: 'umd', name: '@cspark/sdk', exports: 'named' };
const tsconfig = './tsconfig.esm.json';
const input = 'src/index.ts';

export default [
  {
    input,
    output: [
      { file: 'lib/bundle.js', ...bundle },
      { file: 'lib/bundle.min.js', plugins: [terser()], ...bundle },
    ],
    plugins: [
      nodeResolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ tsconfig, removeComments: false }),
    ],
  },
  {
    input,
    output: { file: 'lib/esm/index.mjs', format: 'esm' },
    external: ['node-fetch', 'pako', 'buffer', 'form-data'],
    plugins: [nodeResolve({ preferBuiltins: false }), commonjs(), json(), typescript({ tsconfig })],
  },
  {
    input,
    output: { file: 'lib/types.d.ts', format: 'esm' },
    plugins: [nodeResolve(), dts({ compilerOptions: { removeComments: false } })],
  },
];
