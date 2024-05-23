/**
 * Execute sync batch of 1K-100K records using a chunk approach and Execute APIv4.
 *
 * This execution reads the CSV file chunk by chunk and caches the records of each
 * chunk until it reaches the batch size. Once the desired size is reached, it processes
 * the batch and submits it to the API. This process continues until all records
 * are processed. The results are saved to a file in JSON format for further
 * analysis.
 *
 * This approach is ideal for large datasets that need to be processed sequentially
 * and in smaller chunks to avoid timeouts and improve performance. Additionally,
 * the data is read as JSON array (2D-array) and submitted as-is. This data format
 * is more memory-efficient for data transfer and processing than JSON objects.
 *
 * You are responsible for transforming the data (if needed) and handling any errors
 * that may occur during the process. This process does not handle retries or
 * error/warning recovery that may occur during the model execution as each model
 * may have different requirements.
 *
 * NOTE: `Papaparse` is the module used to parse the CSV file. You will need to
 * install it to run this example.
 */
import Spark, { SparkOptions, LoggerService } from '@cspark/sdk';
import { createReadStream, createWriteStream } from 'fs';
import { join } from 'path';
import Papa from 'papaparse';

/**
 * To run this example, replace the placeholder values with your own.
 * - `sourcePath`: path to the data file (be mindful of the base path)
 * - `sparkOptions`: Spark settings (base URL, authentication and timeout)
 * - `serviceUri`: service URI to execute (folder and service name)
 * - `chunkSize`: number of records to process in each chunk
 * - `headers`: list of headers for the CSV file (the file should contain data only)
 */
async function main() {
  const basePath = join(process.cwd(), 'data');
  const sourcePath = join(basePath, 'my-data-source.csv');
  const serviceUri = 'my-folder/my-service';
  const headers: string[] = ['header1', 'header2', '...', 'headerN'];
  const chunkSize = 500;
  const sparkOptions: SparkOptions = {
    baseUrl: 'my base url',
    apiKey: 'my api key', // or use OAuth2 client credentials.
    timeout: 2 * 60 * 1000, // 2 minutes (in milliseconds)
  };

  // ---------------- You do NOT need to modify below this line ----------------
  const writer = createWriteStream(join(basePath, new Date().toISOString() + '_results.json'));
  const logger = new Logger('sync-batch');
  const spark = new Spark({ ...sparkOptions, logger: { logger } });
  const service = spark.service;

  // This helps keep track of the request ID for each API call (not required).
  spark.config.interceptors.add({
    beforeRequest: (req) => {
      logger.log(`submitting request <${req.headers?.['x-request-id']}>`);
      return req;
    },
  });

  async function submit(values: any[], count: number = 0) {
    const inputs = [headers, ...values]; // submit as JSON array.
    try {
      const response = await service.batch.execute<Inputs, Outputs>(serviceUri, { inputs });

      writer.write(JSON.stringify({ inputs, ...response.data }, null, 2) + (count ? ',\n' : ''));
      logger.log(`chunk ${count} (${values.length} records) processed successfully`);
    } catch (e) {
      logger.error(`failed to process chunk ${count} (${values.length} records)`);
      console.error(e);
    }
  }

  writer.write('[\n');
  const dataset: Inputs[] = [];
  let chunkCount = 0;

  // 1. Read source file chunk by chunk.
  Papa.parse<Inputs>(createReadStream(sourcePath, 'utf8'), {
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

      // 3. Save logs to a file
      logger.dump(basePath);
    },
    error: (e) => console.log('failed to parse CSV file', e),
  });
}

class Logger implements LoggerService {
  private readonly messages: string[] = [];
  constructor(private context: string) {}

  log(message: string) {
    const msg = `[${this.context}] ${new Date().toISOString()} - ${message}`;
    this.messages.push(msg);
    console.log(msg);
  }

  debug(message: string) {
    this.log(message);
  }

  warn(message: string) {
    this.log(message);
  }

  error(message: string) {
    this.log(message);
  }

  dump(basePath: string) {
    const stream = createWriteStream(join(basePath, 'log.txt'));
    stream.write(this.messages.join('\n'));
    stream.end();
  }
}

interface Inputs {
  // Define the input schema (not required)
}

interface Outputs {
  // Define the output schema (not required)
}

main();
