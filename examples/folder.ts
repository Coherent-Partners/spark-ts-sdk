import { createWriteStream } from 'fs';
import Spark, { type SparkClient } from '../src';

function getCategories(spark: SparkClient) {
  spark.folder
    .getCategories()
    .then((response) => console.log(response.data))
    .catch(console.error);
}

function create(spark: SparkClient) {
  spark.folder
    .create({ name: 'some-folder-name' })
    .then((response) => console.log(response.data))
    .catch(console.error);
}

function find(spark: SparkClient) {
  spark.folder
    .find({ favorite: true })
    .then((response) => console.log(response.data))
    .catch(console.error);
}

function update(spark: SparkClient) {
  spark.folder
    .update('some-folder-id', { description: 'new-folder-name' })
    .then((response) => console.log(response.data))
    .catch(console.error);
}

function deleteFolder(spark: SparkClient) {
  spark.folder
    .delete('some-folder-id')
    .then((response) => console.log(response.data))
    .catch(console.error);
}

function downloadFile() {
  Spark.download('file-url-without-authentication')
    .then((buffer) => {
      const file = createWriteStream('my-file.json');
      buffer.pipe(file);
    })
    .catch(console.error);
}

export default {
  create,
  find,
  getCategories,
  update,
  delete: deleteFolder,
  downloadFile,
};
