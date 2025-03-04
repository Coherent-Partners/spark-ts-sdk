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

  // 2. Execute sync batch and save results to a file
  try {
    const response = await services.execute(serviceUri, { inputs: dataset });

    writer.write(JSON.stringify({ inputs: dataset, ...response.data }, undefined, 2));
    logger.log(`bulk of ${total} records processed successfully`);
  } catch (error) {
    logger.error(`failed to process bulk of ${total} records`);
    console.error(error);
  }

  // 3. Clean up resources
  writer.end();
}

main();
