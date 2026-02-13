import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/qr-core.js',
  output: [
    {
      file: 'dist/qr-core.esm.js',
      format: 'es',
    },
    {
      file: 'dist/qr-core.cjs.js',
      format: 'cjs',
      exports: 'named',
    },
    {
      file: 'dist/qr-core.umd.js',
      format: 'umd',
      name: 'QRCore',
      exports: 'named',
    },
    {
      file: 'dist/qr-core.umd.min.js',
      format: 'umd',
      name: 'QRCore',
      exports: 'named',
      plugins: [terser()],
    },
  ],
};
