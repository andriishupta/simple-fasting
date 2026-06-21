const { withXcodeProject } = require('expo/config-plugins');

module.exports = (config) =>
  withXcodeProject(config, (nextConfig) => {
    const widgetBundleIdentifier = `${config.ios.bundleIdentifier}.ExpoWidgetsTarget`;
    const buildConfigurations = nextConfig.modResults.pbxXCBuildConfigurationSection();

    for (const buildConfiguration of Object.values(buildConfigurations)) {
      const buildSettings = buildConfiguration.buildSettings;

      if (buildSettings?.PRODUCT_BUNDLE_IDENTIFIER?.replaceAll('"', '') === widgetBundleIdentifier) {
        buildSettings.MARKETING_VERSION = `"${config.version}"`;
        buildSettings.CURRENT_PROJECT_VERSION = `"${config.ios.buildNumber ?? '1'}"`;
      }
    }

    return nextConfig;
  });
