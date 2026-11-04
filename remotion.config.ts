import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setCodec('h264');
Config.setOverwriteOutput(true);
// Software-WebGL, damit 3D auch ohne GPU (Cloud/Server) funktioniert
Config.setChromiumOpenGlRenderer('swangle');
// In Cloud/Docker-Umgebungen: vorinstallierten Chromium nutzen, falls vorhanden
import {existsSync} from 'node:fs';
if (existsSync('/opt/pw-browsers/chromium')) {
  Config.setBrowserExecutable('/opt/pw-browsers/chromium');
}

// YAML-Dateien (stories/*.yaml) als Text einbinden – die Story-Datei bleibt die einzige Quelle.
Config.overrideWebpackConfig((config) => ({
  ...config,
  module: {...config.module, rules: [...(config.module?.rules ?? []), {test: /\.ya?ml$/, type: 'asset/source'}]},
}));
