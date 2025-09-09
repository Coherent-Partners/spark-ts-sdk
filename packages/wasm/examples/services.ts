import { createReadStream } from 'fs';
import { type HybridClient } from '../src';

function upload(hybrid: HybridClient) {
  hybrid.services
    .upload(createReadStream('wasm-package.zip'))
    .then((response) => console.log(JSON.stringify(response.data, undefined, 2)))
    .catch((error) => console.error(JSON.stringify(error.toJson(), undefined, 2)));
}

function execute(hybrid: HybridClient) {
  hybrid.services
    .execute('my-folder/my-service', { inputs: {} })
    .then((response) => console.log(JSON.stringify(response.data, undefined, 2)))
    .catch((error) => console.error(JSON.stringify(error.toJson(), undefined, 2)));
}

function validate(hybrid: HybridClient) {
  hybrid.services
    .validate('version/uuid', { inputs: {}, validationType: 'static' })
    .then((response) => console.log(JSON.stringify(response.data, undefined, 2)))
    .catch((error) => console.error(JSON.stringify(error.toJson(), undefined, 2)));
}

function getMetadata(hybrid: HybridClient) {
  hybrid.services
    .getMetadata('version/uuid')
    .then((response) => console.log(JSON.stringify(response.data, undefined, 2)))
    .catch((error) => console.error(JSON.stringify(error.toJson(), undefined, 2)));
}

export default { upload, execute, validate, getMetadata };
