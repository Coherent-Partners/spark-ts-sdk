import { createReadStream } from 'fs';
import { type HybridClient } from '../src';

const stringify = (data: unknown) => JSON.stringify(data, undefined, 2);

function upload(hybrid: HybridClient) {
  hybrid.services
    .upload(createReadStream('wasm-package.zip'))
    .then((response) => console.log(stringify(response.data)))
    .catch((error) => console.error(stringify(error.toJson())));
}

function execute(hybrid: HybridClient) {
  hybrid.services
    .execute('my-folder/my-service', { inputs: {} })
    .then((response) => console.log(stringify(response.data)))
    .catch((error) => console.error(stringify(error.toJson())));
}

function validate(hybrid: HybridClient) {
  hybrid.services
    .validate('version/uuid', { inputs: {}, validationType: 'static' })
    .then((response) => console.log(stringify(response.data)))
    .catch((error) => console.error(stringify(error.toJson())));
}

function getMetadata(hybrid: HybridClient) {
  hybrid.services
    .getMetadata('version/uuid')
    .then((response) => console.log(stringify(response.data)))
    .catch((error) => console.error(stringify(error.toJson())));
}

export default { upload, execute, validate, getMetadata };
