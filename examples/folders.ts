import { createWriteStream, createReadStream } from 'fs';
import Spark, { type SparkClient } from '../src';

function getCategories(spark: SparkClient) {
  spark.folders
    .getCategories()
    .then((response) => console.log(response.data))
    .catch(console.error);
}

function create(spark: SparkClient) {
  const fileName = 'my-cover.png';
  const image = createReadStream(fileName);
  spark.folders
    .create({ name: 'some-folder-name', cover: { image, fileName } })
    .then((response) => console.log(response.data))
    .catch(console.error);
}

function find(spark: SparkClient) {
  spark.folders
    .find({ favorite: true })
    .then((response) => console.log(response.data))
    .catch(console.error);
}

function update(spark: SparkClient) {
  spark.folders
    .update('uuid', { description: 'this has been updated.' })
    .then((response) => console.log(response.data))
    .catch(console.error);
}

function deleteFolder(spark: SparkClient) {
  spark.folders
    .delete('uuid')
    .then((response) => console.log(response.data))
    .catch(console.error);
}

function downloadFile() {
  Spark.download('https://example.com/file.json')
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
