// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // eslint-plugin-react-hooks v7 adds React Compiler lint rules. Several
    // of them conflict with canonical React Native patterns (reading an
    // Animated.Value ref during render, PanResponder configs, data fetching
    // that syncs state on mount). Relax those; keep the structural rules.
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
]);
