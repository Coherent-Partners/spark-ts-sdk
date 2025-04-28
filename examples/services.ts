import { createWriteStream, createReadStream } from 'fs';
import { type SparkClient } from '../src';

function create(spark: SparkClient) {
  const file = createReadStream('my-service.xlsx');
  spark.services
    .create({
      file: file,
      folder: 'my-folder',
      service: 'my-service',
      fileName: 'my-service.xlsx',
      trackUser: true,
      maxRetries: 10,
      retryInterval: 3,
    })
    .then((response) => console.log(JSON.stringify(response.publication, undefined, 2)))
    .catch(console.error);
}

function executeOne(spark: SparkClient) {
  const data = { inputs: { value: 'Hello, Spark SDK' } };
  spark.services
    .execute('my-folder/my-service', data)
    .then((response) => console.log(response.data))
    .catch((err) => console.error(JSON.stringify(err.cause, null, 2)));
}

export function executeMany(spark: SparkClient) {
  const batch = [{ value: 1 }, { value: 2 }, { value: 3 }];
  spark.services
    .execute({ folder: 'my-folder', service: 'my-service' }, { inputs: batch })
    .then((response) => console.log(response.data))
    .catch(console.error);
}

export function transform(spark: SparkClient) {
  spark.services
    .transform('my-folder/my-service', {
      inputs: { value: 42 },
      using: 'my-transform',
      encoding: 'gzip',
    })
    .then((response) => console.log(response.data));
}

function getVersions(spark: SparkClient) {
  spark.services
    .getVersions('my-folder/my-service')
    .then((response) => console.log(response.data))
    .catch(console.error);
}

function getSchema(spark: SparkClient) {
  spark.services
    .getSchema('my-folder/my-service')
    .then((response) => console.log(response.data))
    .catch(console.error);
}

function getSwagger(spark: SparkClient) {
  spark.services
    .getSwagger('my-folder/my-service')
    .then((response) => console.log(response.data))
    .catch(console.error);
}

function getMetadata(spark: SparkClient) {
  spark.services
    .getMetadata('my-folder/my-service')
    .then((response) => console.log(response.data))
    .catch(console.error);
}

function validate(spark: SparkClient) {
  spark.services
    .validate('my-folder/my-service', { inputs: { letter: 'b', number: 23 }, validationType: 'dynamic' })
    .then((response) => console.log(JSON.stringify(response.data, null, 2)))
    .catch(console.error);
}

function download(spark: SparkClient) {
  spark.services
    .download({ folder: 'my-folder', service: 'my-service', type: 'configured' })
    .then((response) => {
      const file = createWriteStream('my-configured-excel.xlsx');
      response.buffer.pipe(file);
    })
    .catch(console.error);
}

function search(spark: SparkClient) {
  spark.services
    .search({ limit: 5 })
    .then((response) => console.log(JSON.stringify(response.data, null, 2)))
    .catch(console.error);
}

function recompile(spark: SparkClient) {
  spark.services
    .recompile({ folder: 'my-folder', service: 'my-service', compiler: 'Neuron_v1.16.0' })
    .then((response) => console.log(response.data))
    .catch(console.error);
}

function del(spark: SparkClient) {
  spark.services
    .delete('my-folder/my-service')
    .then((response) => console.log(response.data))
    .catch(console.error);
}

function exportAsZip(spark: SparkClient) {
  spark.services
    .export({ folder: 'my-folder', service: 'my-service', filters: { version: 'latest' } })
    .then((downloadables) => {
      for (const count in downloadables) {
        const file = createWriteStream(`export-${count}.zip`);
        downloadables[count].buffer.pipe(file);
      }
    })
    .catch(console.error);
}

function importFromZip(spark: SparkClient) {
  const file = createReadStream('package.zip');
  spark.services
    .import({
      destination: { source: 'my-folder-source/my-service', target: 'my-folder-target/my-service' },
      file,
    })
    .then((response) => console.log(response.data))
    .catch(console.error);
}

function migrate(spark: SparkClient) {
  const config = spark.config.copyWith({ env: 'prod', apiKey: 'other-key' }); // my import config
  spark.services
    .migrate({
      destination: { source: 'my-folder-source/my-service', target: 'my-folder-target/my-service' },
      config,
    })
    .then((job) => console.log(job.imports))
    .catch(console.error);
}

export default {
  create,
  getSchema,
  getMetadata,
  getVersions,
  getSwagger,
  validate,
  download,
  search,
  recompile,
  delete: del,
  export: exportAsZip,
  import: importFromZip,
  migrate,
  executeOne,
  executeMany,
  transform,
};
