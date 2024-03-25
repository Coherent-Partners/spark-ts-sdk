import { createWriteStream } from 'fs';
import { type SparkClient } from '../src';

function rehydrate(spark: SparkClient) {
  spark.service.log
    .rehydrate('floherent/Subservices', '4556a22d-99fa-4c8f-a154-acbf59b44532')
    .then((response) => {
      console.log(JSON.stringify(response.data, null, 2));
      const file = createWriteStream('my-rehydrated-subservices.xlsx');
      response.buffer.pipe(file);
    })
    .catch((err) => console.error(JSON.stringify(err.cause, null, 2)));
}

function download(spark: SparkClient) {
  spark.service.log
    .download({
      folder: 'floherent',
      service: 'Subservices',
      callIds: ['4556a22d-99fa-4c8f-a154-acbf59b44532'],
      type: 'json',
    })
    .then((response) => {
      // console.log(JSON.stringify(response.data, null, 2));
      const file = createWriteStream('my-log-history.zip');
      response.buffer.pipe(file);
    })
    .catch((err) => console.error(JSON.stringify(err, null, 2)));
}

export default { rehydrate, download };
