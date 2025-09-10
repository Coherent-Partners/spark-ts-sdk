import { createWriteStream } from 'fs';
import { type SparkClient } from '../src';

function find(spark: SparkClient) {
  spark.logs
    .find('my-folder/my-service')
    .then((response) => console.log(JSON.stringify(response.data, null, 2)))
    .catch(console.error);
}

function get(spark: SparkClient) {
  spark.logs
    .get('uuid')
    .then((response) => console.log(JSON.stringify(response.data, null, 2)))
    .catch(console.error);
}

function rehydrate(spark: SparkClient) {
  spark.logs
    .rehydrate('my-folder/my-service', 'uuid')
    .then((response) => {
      console.log(JSON.stringify(response.data, null, 2));
      const file = createWriteStream('my-rehydrated-services.xlsx');
      response.buffer.pipe(file);
    })
    .catch(console.error);
}

function download(spark: SparkClient) {
  spark.logs
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

export default { find, get, rehydrate, download };
