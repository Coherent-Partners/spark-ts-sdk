import { getPlatformInfo } from './utils';

const version = '0.2.10';

const sdkLogger = `CSPARK v${version}`;

const platformInfo: string = getPlatformInfo();

const about: string = `Coherent Spark SDK v${version} (${platformInfo})`;

const sdkUaHeader = `agent=spark-ts-sdk/${version}; env=${platformInfo}`;

export { version, about, sdkUaHeader, sdkLogger };

export class Version {
  readonly major: string;
  readonly minor: string;
  readonly patch: string;
  readonly preRelease: string | null;

  constructor(readonly full: string = '0.0.0-PLACEHOLDER') {
    const [main, preRelease] = full.split('-');
    const parts = main.split('.');
    this.major = parts[0] ?? '0';
    this.minor = parts[1] ?? '0';
    this.patch = parts[2] ?? '0';
    this.preRelease = preRelease ?? null;
  }
}

export const VERSION: Version = new Version(version);
