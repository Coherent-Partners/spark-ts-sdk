import { createWriteStream, createReadStream } from 'fs';
import { type SparkClient } from '@cspark/sdk';

function downloadWasm(spark: SparkClient) {
  spark.wasm
    .download({ versionId: 'uuid' })
    .then((response) => {
      const file = createWriteStream('my-service-wasm.zip');
      response.buffer.pipe(file);
    })
    .catch(console.error);
}

function exportEntities(spark: SparkClient) {
  spark.impex
    .export({ services: ['my-folder/my-service'], maxRetries: 5, retryInterval: 3 })
    .then((downloadables) => {
      for (const count in downloadables) {
        const file = createWriteStream(`exported-${count}.zip`);
        downloadables[count].buffer.pipe(file);
      }
    })
    .catch(console.error);
}

function importEntities(spark: SparkClient) {
  const exported = createReadStream('exported.zip');
  spark.impex
    .import({ file: exported, destination: 'my-folder/my-service', maxRetries: 7, retryInterval: 3 })
    .then((response) => console.log(JSON.stringify(response.data, null, 2)))
    .catch(console.error);
}

export default {
  downloadWasm,
  export: exportEntities,
  import: importEntities,
};
