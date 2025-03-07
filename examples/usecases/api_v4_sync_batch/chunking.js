import { Logger, SparkClient } from '@cspark/sdk';
import { readFileSync, createWriteStream } from 'fs';

async function main() {
  const sourcePath = 'inputs.json';
  const outputPath = 'outputs.json';
  const baseUrl = 'https://spark.uat.us.coherent.global/fieldengineering';
  const token = 'Bearer access_token';
  const serviceUri = 'my-folder/volume-cylinder';
  const chunkSize = 20;

  // ---------------- You do NOT need to modify below this line ----------------
  const writer = createWriteStream(outputPath);
  const logger = Logger.of();
  const services = new SparkClient({ baseUrl, token }).services;

  // 1. Read data from a source file
  const dataset = JSON.parse(readFileSync(sourcePath, 'utf8'));
  const total = dataset.length;
  const batchSize = Math.ceil(total / chunkSize);

  logger.log(`${total} records found in ${sourcePath}`);
  writer.write('[\n');

  // 2. Chunk dataset, execute each synchronously and save results to a file
  for (let i = 0; i < batchSize; i++) {
    // Alternatively, read the file in chunks to avoid memory issues
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, total);
    const chunk = dataset.slice(start, end);

    try {
      const response = await services.execute(serviceUri, { inputs: chunk });

      const newline = i < batchSize - 1 ? ',\n' : '';
      writer.write(JSON.stringify({ inputs: chunk, ...response.data }, null, 2) + newline);
      logger.log(`chunk ${i + 1} (${chunk.length} records) processed successfully`);
    } catch (e) {
      logger.error(`failed to process chunk ${i + 1} (${chunk.length} records)`);
      console.error(e);
    }
  }

  // 3. Clean up resources
  writer.write('\n]');
  writer.end();
}

main();
