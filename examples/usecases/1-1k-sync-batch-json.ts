/**
 * Execute sync batch of 1-1K records using a bulk approach.
 *
 * This execution is based on the Execute APIv4 and can submit a bulk of records
 * in a single API call. This approach is more efficient than the Execute APIv3
 * as it reduces the number of API calls and improves the overall performance.
 * However, there's only one call ID generated for the entire bulk, which may
 * make it harder to track individual records. In addition, depending on the
 * number of records, you may need to adjust the timeout accordingly.
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
 *
 * If you are using TypeScript, you may choose to define the input and output schemas:
 * - Inputs: input schema
 * - Outputs: output schema
 */
async function main() {
  const basePath = join(process.cwd(), 'data');
  const sourcePath = join(basePath, 'my-data-source.json');
  const serviceUri = 'my-folder/my-service';
  const sparkOptions: SparkOptions = {
    baseUrl: 'my base url',
    token: 'my bearer token',
    timeout: 2 * 60 * 1000, // 2 minutes (in milliseconds)
  };

  // ---------------- You do NOT need to modify below this line ----------------
  const writer = createWriteStream(join(basePath, new Date().toISOString() + '_results.json'));
  const logger = new Logger('sync-batch');
  const spark = new Spark({ ...sparkOptions, logger: { logger } });

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

  logger.log(`${total} records found in ${sourcePath}`);

  // 2. Execute sync batch and save results to a file
  try {
    const response = await spark.service.batch.execute<Inputs, Outputs>(serviceUri, { inputs: dataset });

    writer.write(JSON.stringify({ inputs: dataset, ...response.data }, null, 2));
    logger.log(`bulk of ${total} records processed successfully`);
  } catch (e) {
    logger.error(`failed to process bulk of ${total} records`);
    console.error(e);
  }

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
