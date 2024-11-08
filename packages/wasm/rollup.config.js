const nodeResolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const terser = require('@rollup/plugin-terser');

// Browser-friendly UMD build.
const bundle = { format: 'umd', name: '@cspark/wasm', exports: 'named' };

exports.default = [
  {
    input: 'src/index.ts',
    output: [
      { file: 'lib/bundle.js', ...bundle },
      { file: 'lib/bundle.min.js', plugins: [terser()], ...bundle },
    ],
    plugins: [
      nodeResolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.esm.json' }),
    ],
  },
  {
    input: 'src/index.ts',
    output: { file: 'lib/esm/index.mjs', format: 'esm' },
    external: ['@cspark/sdk'],
    plugins: [
      nodeResolve({ preferBuiltins: false }),
      commonjs(),
      require('@rollup/plugin-json')(),
      typescript({ tsconfig: './tsconfig.esm.json', removeComments: true }),
    ],
  },
  {
    input: 'src/index.ts',
    output: [{ file: 'lib/types.d.ts', format: 'esm' }],
    plugins: [nodeResolve(), require('rollup-plugin-dts').dts()],
  },
];
