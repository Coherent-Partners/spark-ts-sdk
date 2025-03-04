import Papa from 'papaparse';
import { Logger, SparkClient } from '@cspark/sdk';
import { createReadStream, createWriteStream } from 'fs';

async function main() {
  const sourcePath = 'inputs.csv';
  const outputPath = 'outputs.json';
  const baseUrl = 'https://spark.uat.us.coherent.global/fieldengineering';
  const token = 'Bearer access_token';
  const serviceUri = 'my-folder/volume-cylinder';
  const headers = ['radius', 'height'];
  const chunkSize = 20;

  // ---------------- You do NOT need to modify below this line ----------------
  const writer = createWriteStream(outputPath);
  const logger = Logger.of();
  const services = new SparkClient({ baseUrl, token }).services;

  async function submit(values, count = 0) {
    const inputs = [headers, ...values]; // submit as JSON array.
    try {
      const response = await services.execute(serviceUri, { inputs });

      writer.write(JSON.stringify({ inputs, ...response.data }, null, 2) + (count ? ',\n' : ''));
      logger.log(`chunk ${count} (${values.length} records) processed successfully`);
    } catch (error) {
      logger.error(`failed to process chunk ${count} (${values.length} records)`);
      console.error(error);
    }
  }

  writer.write('[\n');
  const dataset = [];
  let chunkCount = 0;

  // 1. Read source file chunk by chunk.
  Papa.parse(createReadStream(sourcePath, 'utf8'), {
    chunk: async (results, parser) => {
      parser.pause();
      chunkCount++;
      dataset.push(...results.data); // NOTE: apply any transformation here.

      // 2. Process chunk if it reaches the chunk size.
      while (dataset.length >= chunkSize) {
        const inputs = dataset.splice(0, chunkSize);
        await submit(inputs, chunkCount);
      }

      parser.resume();
    },
    complete: async () => {
      // process remaining records (if any)
      while (dataset.length) await submit(dataset.splice(0, chunkSize), chunkCount++);
      writer.write('\n]');
      writer.end();
    },
    error: (e) => console.log('failed to parse CSV file', e),
  });
}

main();
