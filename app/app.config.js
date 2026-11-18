// Extends app.json. Lets a build override the web base path:
//   EXPO_BASE_URL=""                    → served from the site root (npm run local)
//   (unset)                             → app.json's "/vocabulary-builder" (GitHub Pages)
module.exports = ({ config }) => {
  if (process.env.EXPO_BASE_URL === undefined) return config;
  return {
    ...config,
    experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL.replace(/\/$/, '') },
  };
};
