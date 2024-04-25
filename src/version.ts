import { getBrowserInfo } from './utils';

const version = '0.1.0';

const sdkLogger = `CSPARK v${version}`;

const userAgentHeader = `Coherent Spark SDK v${version} (${getBrowserInfo() ?? `Node ${process.version}`})`;

const sdkUaHeader = (() => {
  const analytics = {
    agent: `cspark-ts-sdk/${version}`,
    env: getBrowserInfo() ?? `Node/${process.version.replace('v', '')}`,
  } as Record<string, string>;

  return Object.keys(analytics)
    .map((k) => `${k}=${analytics[k]}`)
    .join('; ')
    .trim();
})();

export { version, userAgentHeader, sdkUaHeader, sdkLogger };
