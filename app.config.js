module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins ?? []), "expo-secure-store"],
  experiments: {
    ...config.experiments,
    // GitHub project sites use a subdirectory; custom domains use the root.
    baseUrl: process.env.NAYIQ_WEB_BASE_PATH || "",
  },
});
