const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

module.exports = (config) =>
  withDangerousMod(config, [
    'ios',
    async (nextConfig) => {
      const propertiesPath = path.join(nextConfig.modRequest.platformProjectRoot, 'Podfile.properties.json');
      const properties = fs.existsSync(propertiesPath)
        ? JSON.parse(fs.readFileSync(propertiesPath, 'utf8'))
        : {};

      properties['ios.buildReactNativeFromSource'] = 'true';

      fs.writeFileSync(propertiesPath, `${JSON.stringify(properties, null, 2)}\n`);

      return nextConfig;
    },
  ]);
