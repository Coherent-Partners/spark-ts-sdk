import { Logger, SparkClient } from '@cspark/sdk';
import { readFileSync, createWriteStream } from 'fs';

async function main() {
  const sourcePath = 'inputs.json';
  const outputPath = 'outputs.json';
  const baseUrl = 'https://spark.uat.us.coherent.global/fieldengineering';
  const token = 'Bearer access_token';
  const serviceUri = 'my-folder/volume-cylinder';

  // ---------------- You do NOT need to modify below this line ----------------
  const writer = createWriteStream(outputPath);
  const logger = Logger.of();
  const services = new SparkClient({ baseUrl, token }).services;

  // 1. Read data from a source file
  const dataset = JSON.parse(readFileSync(sourcePath, 'utf8'));
  const total = dataset.length;

  logger.log(`${total} records found in ${sourcePath}`);
  writer.write('[\n');

  // 2. Execute sync batch and save results to a file
  for (let i = 0; i < dataset.length; i++) {
    const inputs = dataset[i];
    try {
      const response = await services.execute(serviceUri, { inputs, responseFormat: 'original' });
      const result = { inputs, outputs: response.data.response_data.outputs };
      const newline = i < total - 1 ? ',\n' : '';

      writer.write(JSON.stringify(result, undefined, 2) + newline);
      logger.log(`record ${i + 1} processed successfully`);
    } catch (error) {
      logger.error(`failed to process record ${i + 1}`);
      console.error(error.message);
    }
  }

  // 3. Clean up resources
  writer.write('\n]');
  writer.end();
}

main();
