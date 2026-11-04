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
