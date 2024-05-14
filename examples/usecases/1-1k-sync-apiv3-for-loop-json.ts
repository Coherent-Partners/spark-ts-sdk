/**
 * Execute sync batch of 1-1K records using a for-loop approach.
 *
 * This execution is based on the Execute APIv3 and uses a for-loop approach to
 * submit each record individually and sequentially. Benefits of running this type
 * of iteration include the generation of a call ID for each API call, which can
 * be used to retrieve a detailed log of the execution.
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
 * - `sparkOptions`: Spark settings (base URL and authentication)
 * - `serviceUri`: locate service to execute (folder and service name)
 *
 * If you are using TypeScript, you may choose to define the input and output schemas:
 * - Inputs: input schema
 * - Outputs: output schema
 *
 * This should be a good starting point to understand how to execute a sync batch
 * using the Execute APIv3. You can adjust the code to fit your specific needs.
 * However, consider using another approach if you need to process larger number (1K+)
 * of records or asynchronous calls.
 */
async function main() {
  const basePath = join(process.cwd(), 'data');
  const sourcePath = join(basePath, 'my-data-source.json');
  const sparkOptions: SparkOptions = { baseUrl: 'my base url', token: 'my bearer token' };
  const serviceUri = 'my-folder/my-service';

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
  writer.write('[\n');

  // 2. Execute sync batch and save results to a file
  for (let i = 0; i < dataset.length; i++) {
    const inputs = dataset[i];
    try {
      const response = await spark.service.execute<Inputs, Outputs>(serviceUri, { inputs });
      const result = { inputs, result: response.data };

      writer.write(JSON.stringify(result, null, 2) + (i < total - 1 ? ',\n' : ''));
      logger.log(`record ${i + 1} processed successfully`);
    } catch (e) {
      logger.error(`failed to process record ${i + 1}`);
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
