/**
 * Execute sync batch of 1K-100K records using a chunk approach.
 *
 * This execution splits the data into chunks and submits each chunk as a separate
 * API call. This approach is more efficient than the submission of large bulk of
 * records in a single API call, as it reduces the risk of timeouts and improves
 * the overall performance.
 *
 * This example also assumes that the data is coming from a data file (JSON format)
 * and will output the results to a file in JSON format. If you need to process
 * CSV or other formats, you will need to adjust the readFile function accordingly.
 *
 * Every API call will be logged to the console and saved to a log file.
 */
import Spark, { SparkOptions, LoggerService } from '@cspark/sdk';
import { readFileSync, createWriteStream } from 'fs';
import { join } from 'path';

/**
 * To run this example, replace the placeholder values with your own.
 * - `sourcePath`: path to the data file (be mindful of the base path)
 * - `sparkOptions`: Spark settings (base URL, authentication and timeout)
 * - `serviceUri`: locate service to execute (folder and service name)
 * - `chunkSize`: number of records to process in each chunk
 *
 * If you are using TypeScript, you may choose to define the input and output schemas:
 * - Inputs: input schema
 * - Outputs: output schema
 */
async function main() {
  const basePath = join(process.cwd(), 'data');
  const sourcePath = join(basePath, 'my-data-source.json');
  const serviceUri = 'my-folder/my-service';
  const chunkSize = 1000;
  const sparkOptions: SparkOptions = {
    baseUrl: 'my base url',
    token: 'my bearer token',
    timeout: 2 * 60 * 1000, // 2 minutes (in milliseconds)
  };

  // ---------------- You do NOT need to modify below this line ----------------
  const writer = createWriteStream(join(basePath, new Date().toISOString() + '_results.json'));
  const logger = new Logger('sync-batch');
  const spark = new Spark({ ...sparkOptions, logger: { logger } });
  const batch = spark.service.batch;

  // This helps keep track of the request ID for each API call (not required).
  spark.config.interceptors.add({
    beforeRequest: (req) => {
      logger.log(`submitting request <${req.headers?.['x-request-id']}>`);
      return req;
    },
  });

  // 1. Read data from a source file
  const dataset = readFile(sourcePath);
  const total = dataset.length;
  const batchSize = Math.ceil(total / chunkSize);

  logger.log(`${total} records found in ${sourcePath}`);
  writer.write('[\n');

  // 2. Execute sync batch and save results to a file
  for (let i = 0; i < batchSize; i++) {
    // Alternatively, read the file in chunks to avoid memory issues
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, total);
    const chunk = dataset.slice(start, end);

    try {
      const response = await batch.execute<Inputs, Outputs>(serviceUri, { inputs: chunk });

      writer.write(JSON.stringify({ inputs: chunk, ...response.data }, null, 2) + (i < batchSize - 1 ? ',\n' : ''));
      logger.log(`chunk ${i + 1} (${chunk.length} records) processed successfully`);
    } catch (e) {
      logger.error(`failed to process chunk ${i + 1} (${chunk.length} records)`);
      console.error(e);
    }
  }

  writer.write('\n]');
  writer.end();

  // 3. Save logs to a file
  logger.dump(basePath);
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

function readFile(filePath: string): Inputs[] {
  const content = readFileSync(filePath, 'utf8');

  // Parse and format content as needed
  return JSON.parse(content);
}

interface Inputs {
  // Define the input schema (not required)
}

interface Outputs {
  // Define the output schema (not required)
}

main();
