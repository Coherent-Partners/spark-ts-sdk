import { createWriteStream } from 'fs';
import { type SparkClient } from '@cspark/sdk';

function rehydrate(spark: SparkClient) {
  spark.service.log
    .rehydrate('my-folder/my-service', 'uuid')
    .then((response) => {
      console.log(JSON.stringify(response.data, null, 2));
      const file = createWriteStream('my-rehydrated-subservices.xlsx');
      response.buffer.pipe(file);
    })
    .catch(console.error);
}

function download(spark: SparkClient) {
  spark.service.log
    .download({
      folder: 'my-folder',
      service: 'my-service',
      callIds: ['uuid1', 'uuid2', 'uuid3'],
      type: 'json',
    })
    .then((response) => {
      console.log(JSON.stringify(response.data, null, 2));
      const file = createWriteStream('my-log-history.zip');
      response.buffer.pipe(file);
    })
    .catch(console.error);
}

export default { rehydrate, download };
