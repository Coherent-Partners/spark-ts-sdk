import { Logger } from '@cspark/sdk';
import { HybridClient } from '@cspark/wasm';
import { readFileSync, createWriteStream } from 'fs';

async function main() {
  const sourcePath = 'inputs.json';
  const outputPath = 'outputs.json';
  const baseUrl = 'http://localhost:3000/fieldengineering';
  const token = 'open';
  const serviceUri = 'version/91299a5d-9328-4435-911b-4e5f7783f5d4';

  // ---------------- You do NOT need to modify below this line ----------------
  const writer = createWriteStream(outputPath);
  const logger = Logger.of();
  const services = new HybridClient({ baseUrl, token }).services;

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
