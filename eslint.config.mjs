import nextConfig from 'eslint-config-next'

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ['.next/**', 'node_modules/**', 'public/**'],
  },
  {
    // These React Compiler rules (bundled by eslint-plugin-react-hooks v7,
    // which eslint-config-next pulls in) are new, experimental, and encode
    // an architectural opinion (effects shouldn't orchestrate data fetching)
    // this codebase hasn't adopted — lib/store.tsx's mount-time load is a
    // deliberate, pre-existing pattern. Kept as warnings, not silenced,
    // so they stay visible without failing `pnpm lint`.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
]

export default eslintConfig
