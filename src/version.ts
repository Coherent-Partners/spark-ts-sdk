import { getBrowserInfo } from './utils';

const version = '0.2.4';

const sdkLogger = `CSPARK v${version}`;

const platformInfo = getBrowserInfo() ?? `Node/${process?.version?.replace('v', '')}`;

const about = `Coherent Spark SDK v${version} (${platformInfo})`;

const sdkUaHeader = [`agent=spark-ts-sdk/${version}`, `env=${platformInfo}`].join('; ');

export { version, about, sdkUaHeader, sdkLogger };
