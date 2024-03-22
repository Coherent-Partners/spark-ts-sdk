import { createWriteStream } from 'fs';
import { type SparkClient } from '../src';

function download(spark: SparkClient) {
  spark.wasm
    .download({ versionId: '0acc7c89-d33d-4ad7-8262-48a21f5ea673' })
    .then((response) => {
      const file = createWriteStream('susbervices.zip');
      response.buffer.pipe(file);
    })
    .catch(console.error);
}

export default {
  download,
};
