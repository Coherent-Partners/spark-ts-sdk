import { getBrowserInfo } from './utils';

const version = '0.2.4';

const sdkLogger = `CSPARK v${version}`;

const platformInfo = getBrowserInfo() ?? `Node/${process?.version?.replace('v', '')}`;

const about = `Coherent Spark SDK v${version} (${platformInfo})`;

const sdkUaHeader = [`agent=spark-ts-sdk/${version}`, `env=${platformInfo}`].join('; ');

export { version, about, sdkUaHeader, sdkLogger };

export class Version {
  public readonly major: string;
  public readonly minor: string;
  public readonly patch: string;

  constructor(public full: string = '0.0.0-PLACEHOLDER') {
    const parts = full.split('.');
    this.major = parts[0];
    this.minor = parts[1];
    this.patch = parts.slice(2).join('.');
  }
}

export const VERSION = new Version(version);
