/**
 * Execute async batch of 100K-1M records using a chunk approach and Execute APIv4.
 *
 * Multiple workers are used to process the data in parallel. Each worker is responsible
 * for processing a chunk of the data and submitting it to the API.
 *
 * Use https://www.typescriptlang.org/play/ to convert TypeScript to JavaScript.
 */
import { createReadStream, createWriteStream } from 'fs';
import { Worker } from 'worker_threads';
import { join } from 'path';
import Papa from 'papaparse';
import os from 'os';

let chunkId = 1;
let totalRecords = 0;
let totalProcessed = 0;

async function main() {
  const basePath = join(process.cwd(), 'data');
  const sourcePath = join(basePath, 'my-data-source.csv');
  const headers: string[] = ['header1', 'header2', '...', 'headerN'];
  const chunkSize = 2000;
  const initialThreads = 4;
  const logger = new Logger('async-batch');

  // ---------------- You do NOT need to modify below this line ----------------
  const writer = createWriteStream(join(basePath, new Date().toISOString() + '_results.json'));
  writer.write('[\n');

  const threads = Math.min(initialThreads, os.cpus().length);
  const workers = Array.from({ length: threads }, () => {
    const worker = new Worker(join(__dirname, 'worker.js'));
    worker.on('message', save);
    worker.on('error', (e) => console.error('error occurred in worker', e));
    return worker;
  });

  function submit(values: any[], chunkId: number) {
    const batchSize = Math.ceil(values.length / threads);
    for (let i = 0; i < workers.length; i++) {
      const batch = values.slice(i * batchSize, (i + 1) * batchSize);
      const inputs = [headers, ...batch]; // submit as JSON array.

      workers[i].postMessage({ inputs, chunkId });
    }
  }

  function save(response: { ok: boolean; chunkId: number; data: any }) {
    const { chunkId, data } = response ?? {};
    if (response.ok) {
      writer.write(JSON.stringify({ ...data }, null, 2) + ',\n');
      logger.log(`chunk ${chunkId} (${data?.outputs?.length ?? 0} records) processed successfully`);
    } else {
      logger.error(`failed to process part of chunk ${chunkId}`);
      console.error(response.data);
    }

    totalProcessed += data?.inputs?.length - 1 ?? 0;
    if (totalProcessed < totalRecords) return;

    // reached the end of the file
    writer.write('\n]');
    writer.end();
    logger.dump(basePath);
    workers.forEach((worker) => worker.terminate());
  }

  const dataset: Inputs[] = [];
  Papa.parse<Inputs>(createReadStream(sourcePath, 'utf8'), {
    chunk: (results, parser) => {
      parser.pause();

      totalRecords += results.data.length;
      dataset.push(...results.data); // NOTE: apply any transformation here.

      while (dataset.length >= chunkSize) {
        const inputs = dataset.splice(0, chunkSize);
        submit(inputs, chunkId++);
      }

      parser.resume();
    },
    complete: () => {
      // process remaining records (if any)
      while (dataset.length) submit(dataset.splice(0, chunkSize), chunkId++);
    },
    error: (e) => console.log('failed to parse CSV file', e),
  });
}

class Logger {
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

export interface Inputs {
  // Define the input schema (not required)
}

export interface Outputs {
  // Define the output schema (not required)
}

main();

/**
 * The code below should be pasted into a separate file named `worker.ts`.
 *
 * Run command `node --max-old-space-size=8192 index.js` to start the process
 * with increased memory limit (8GB) for larger datasets that require more memory.
 *
 */
// import { parentPort } from 'worker_threads';
// import Spark from '@cspark/sdk';

// import { Inputs, Outputs } from './main-thread.ts';

// parentPort?.on('message', async (data: { inputs: Inputs[]; chunkId: number }) => {
//   const { inputs, chunkId } = data;
//   const serviceUri = 'my-folder/my-service';
//   const spark = new Spark({
//     baseUrl: 'my base url',
//     apiKey: 'my api key', // or use OAuth2 client credentials.
//     timeout: 2 * 60 * 1000, // 2 minutes (in milliseconds)
//   });

//   try {
//     const response = await spark.service.batch.execute<Inputs, Outputs>(serviceUri, { inputs });
//     parentPort?.postMessage({ ok: true, chunkId, data: { inputs, ...response.data } });
//   } catch (error) {
//     parentPort?.postMessage({ ok: false, chunkId, data: { inputs, error } });
//   }
// });
