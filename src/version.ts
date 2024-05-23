import { getBrowserInfo } from './utils';

const version = '0.1.2';

const sdkLogger = `CSPARK v${version}`;

const platformInfo = getBrowserInfo() ?? `Node/${process?.version?.replace('v', '')}`;

const about = `Coherent Spark SDK v${version} (${platformInfo})`;

const sdkUaHeader = [`agent=cspark-ts-sdk/${version}`, `env=${platformInfo}`].join('; ');

export { version, about, sdkUaHeader, sdkLogger };
