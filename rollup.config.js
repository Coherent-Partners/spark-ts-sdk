const nodeResolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const json = require('@rollup/plugin-json');
const terser = require('@rollup/plugin-terser');

// Browser-friendly UMD build.
const bundle = {
  format: 'umd',
  name: '@cspark/sdk',
  sourcemap: true,
  exports: 'named',
};

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
    output: { dir: 'lib/esm', format: 'esm', sourcemap: true },
    external: ['node-fetch'],
    plugins: [
      nodeResolve({ preferBuiltins: false }),
      commonjs(),
      json(),
      typescript({ tsconfig: './tsconfig.esm.json', declaration: true }),
    ],
  },
];
