import { type SparkClient } from '../src';

function list(spark: SparkClient) {
  spark.transforms
    .list('my-folder')
    .then((response) => console.log(JSON.stringify(response.data, null, 2)))
    .catch(console.error);
}

function validate(spark: SparkClient) {
  spark.transforms
    .validate('stringified transform content goes here')
    .then((response) => console.log(JSON.stringify(response.data, null, 2)))
    .catch(console.error);
}

function save(spark: SparkClient) {
  spark.transforms
    .save({ name: 'my-transform', folder: 'my-folder', transform: { apiVersion: 'v4', inputs: 'my-jsonata' } })
    .then((response) => console.log(JSON.stringify(response.data, null, 2)))
    .catch(console.error);
}

function get(spark: SparkClient) {
  spark.transforms
    .get('my-folder/my-transform')
    .then((response) => console.log(JSON.stringify(response.data, null, 2)))
    .catch(console.error);
}

function del(spark: SparkClient) {
  spark.transforms
    .delete('my-folder/my-transform')
    .then((response) => console.log(JSON.stringify(response.data, null, 2)))
    .catch(console.error);
}

export default { list, validate, save, get, delete: del };
