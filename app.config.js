module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    // GitHub project sites use a subdirectory; custom domains use the root.
    baseUrl: process.env.NAYIQ_WEB_BASE_PATH || "",
  },
});
