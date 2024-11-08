import { type HybridClient } from '../src';

function healthCheck(hybrid: HybridClient) {
  hybrid.health
    .check()
    .then((response) => console.log(response.data))
    .catch((error) => console.error(JSON.stringify(error.toJson(), undefined, 2)));
}

function getVersion(hybrid: HybridClient) {
  hybrid.version
    .get()
    .then((response) => console.log(response.data))
    .catch((error) => console.error(JSON.stringify(error.toJson(), undefined, 2)));
}

export default { healthCheck, getVersion };
