exports.default = {
  input: 'src/index.ts',
  output: {
    file: 'lib/bundle.js',
    format: 'umd',
    name: '@cspark/sdk',
    sourcemap: true,
    exports: 'named',
  },
  plugins: [
    require('@rollup/plugin-node-resolve')({ browser: true, preferBuiltins: false }),
    require('@rollup/plugin-commonjs')(),
    require('@rollup/plugin-typescript')({ tsconfig: './tsconfig.esm.json' }),
    require('@rollup/plugin-terser')(),
  ],
};
