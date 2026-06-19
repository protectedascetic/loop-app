/**
 * Dynamic Expo config.
 *
 * Base config lives in app.json (passed in as `config`). We only override
 * the path to google-services.json so it can come from an EAS *file secret*
 * at build time — the file itself stays out of git (.gitignore).
 *
 * Local builds fall back to ./google-services.json.
 * EAS builds: create the secret once with
 *   eas secret:create --scope project --name GOOGLE_SERVICES_JSON \
 *     --type file --value ./google-services.json
 * EAS then exposes GOOGLE_SERVICES_JSON as the absolute path to the file.
 */
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? config.android.googleServicesFile,
  },
});
