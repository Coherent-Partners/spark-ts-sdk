import { getBrowserInfo } from './utils';

const version = '0.2.5';

const sdkLogger = `CSPARK v${version}`;

const platformInfo = getBrowserInfo() ?? `Node/${process?.version?.replace('v', '')}`;

const about = `Coherent Spark SDK v${version} (${platformInfo})`;

const sdkUaHeader = `agent=spark-ts-sdk/${version}; env=${platformInfo}`;

export { version, about, sdkUaHeader, sdkLogger };

export class Version {
  readonly major: string;
  readonly minor: string;
  readonly patch: string;

  constructor(readonly full: string = '0.0.0-PLACEHOLDER') {
    const parts = full.split('.');
    this.major = parts[0];
    this.minor = parts[1];
    this.patch = parts.slice(2).join('.');
  }
}

export const VERSION = new Version(version);
