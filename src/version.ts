import { isBrowser } from './utils';

const version = '0.1.0-dev';

const sdkUaHeader = buildUserAgentHeader();

const userAgentHeader = `Coherent Spark SDK v${version} (${
  isBrowser() ? navigator.userAgent : `Node ${process.version}`
})`;

function buildUserAgentHeader() {
  const analytics = {
    agent: `cspark-ts-sdk/${version}`,
    env: isBrowser() ? navigator.userAgent : `Node/${process.version.replace('v', '')}`,
  } as Record<string, string>;

  return Object.keys(analytics)
    .map((k) => `${k}=${analytics[k]}`)
    .join('; ')
    .trim();
}

export { version, userAgentHeader, sdkUaHeader };
