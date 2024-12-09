import http from 'http';
import { once } from 'events';
import { Buffer } from 'buffer';
import { Config } from '../../src/config';
import { ApiResource, Uri, BaseUrl } from '../../src';

// Use a custom BaseUrl for testing purposes.
export class TestBaseUrl extends BaseUrl {
  constructor(baseUrl: string, tenant: string) {
    // bypass the URL validation
    super(baseUrl, tenant);
  }
}

// A fake Spark API resource for testing purposes.
export class TestApiResource extends ApiResource {
  protected readonly baseUri!: Uri;
  constructor(config: Config) {
    super(config);
    this.baseUri = Uri.from(undefined, { base: this.config.baseUrl.value, version: 'test-resource' });
  }

  slow() {
    return this.request(this.baseUri.value.concat('/slow-response'));
  }

  unauthorized() {
    return this.request(this.baseUri.value.concat('/unauthorized'));
  }

  rateLimited() {
    return this.request(this.baseUri.value.concat('/rate-limited'));
  }
}

// A simple local server for testing purposes.
// Inspired by https://github.com/node-fetch/node-fetch/blob/main/test/utils/server.js
export default class LocalServer {
  private server: http.Server;
  nextResponseHandler?: (res: http.ServerResponse<http.IncomingMessage>) => void;

  constructor(readonly hostname: string = 'localhost') {
    this.server = http.createServer(this.router);
    this.server.keepAliveTimeout = 1000;
    this.server.on('error', (err) => console.error(err.stack));
    this.server.on('connection', (socket) => socket.setTimeout(1500));
  }

  async start() {
    this.server.listen(0, this.hostname);
    return once(this.server, 'listening');
  }

  async stop() {
    this.server.close();
    return once(this.server, 'close');
  }

  get port() {
    const address = this.server.address();
    return typeof address === 'string' ? address : address?.port;
  }

  get baseUrl() {
    return new TestBaseUrl(`http://${this.hostname}:${this.port}`, 'my-tenant');
  }

  router(req: http.IncomingMessage, res: http.ServerResponse) {
    const pathname = req.url;

    // TestApiResource.slow()
    if (pathname === '/test-resource/slow-response') {
      const timeout = setTimeout(() => {
        res.statusCode = 200;
        res.end();
      }, 1000);
      res.on('close', () => clearTimeout(timeout));
    }

    // TestApiResource.unauthorized()
    if (pathname === '/test-resource/unauthorized') {
      res.statusCode = 401;
      res.end();
    }

    // TestApiResource.rateLimited()
    if (pathname === '/test-resource/rate-limited') {
      res.statusCode = 429;
      res.setHeader('x-retry-after', '.1'); // propose retry after 100ms
      res.end();
    }

    // OtherResource.fetchData()
    if (pathname === '/extended/resource') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end('{"status": "fetched"}');
    }

    // Spark.folders.getCategories()
    if (pathname === '/api/v1/lookup/getcategories') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          status: 'Success',
          message: null,
          errorCode: null,
          data: [{ key: 'Other', value: 'Other', icon: 'other.svg' }],
        }),
      );
    }

    // Spark.services.execute('my-folder/my-service')
    if (pathname === '/my-tenant/api/v3/folders/my-folder/services/my-service/execute') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          status: 'Success',
          response_data: { outputs: { my_output: 42 } },
          response_meta: {},
          error: null,
        }),
      );
    }

    // Spark.services.execute('my-folder/my-service', inputs)
    if (pathname === '/my-tenant/api/v3/public/folders/my-folder/services/my-service/execute') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          status: 'Success',
          response_data: { outputs: { my_output: 44 } },
          response_meta: {},
          error: null,
        }),
      );
    }

    // Spark.services.execute('my-folder/my-service', metadata)
    if (pathname === '/my-tenant/api/v3/public/version/version_uuid') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          status: 'Success',
          response_data: { outputs: { single_output: 42 } },
          response_meta: { version_id: 'version_uuid' },
          error: null,
        }),
      );
    }

    // Spark.services.execute('my-folder/my-service', [inputs])
    if (pathname === '/my-tenant/api/v4/execute') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          outputs: [{ my_output: 42 }, { my_output: 43 }],
          process_time: [4, 2],
          service_id: 'service_uuid',
          // and more ...
        }),
      );
    }

    // Spark.services.download('my-folder/my-service')
    if (pathname === '/api/v1/product/my-folder/engines/my-service/download/?filename=&type=withmetadata') {
      const buffer = Buffer.from('fake excel file');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.statusCode = 200;
      res.end(buffer);
    }

    // Spark.batches.create('f/s', metadata)
    if (pathname === '/my-tenant/api/v4/batch') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ object: 'batch', id: 'batch_uuid', data: {} }));
    }

    // Spark.batches.of('id').push({ raw: string_data })
    if (pathname === '/my-tenant/api/v4/batch/batch_uuid/chunks') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          request_timestamp: '1970-01-23T00:00:00.000Z',
          batch_status: 'in_progress',
          pipeline_status: 'idle',
          input_buffer_used_bytes: 1024,
          input_buffer_remaining_bytes: 1024,
          output_buffer_used_bytes: 512,
          output_buffer_remaining_bytes: 512,
          records_available: 0,
          compute_time_ms: 0,
          records_completed: 0,
          record_submitted: 3,
        }),
      );
    }

    // Spark.batches.of('id').pull()
    if (pathname === '/my-tenant/api/v4/batch/batch_uuid/chunkresults?max_chunks=2') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          data: [
            { id: '0001', outputs: [{ result: 20 * 65 }, { result: 74 * 73 }] },
            { id: 'random_uuid', outputs: [{ result: 20 * 65 }] },
          ],
          status: {
            request_timestamp: '1970-01-23T00:00:00.000Z',
            response_timestamp: '1970-01-23T00:00:01.000Z',
            batch_status: 'idle',
            pipeline_status: 'idle',
            input_buffer_used_bytes: 0,
            input_buffer_remaining_bytes: 2048,
            output_buffer_used_bytes: 0,
            output_buffer_remaining_bytes: 1024,
            records_available: 0,
            compute_time_ms: 142,
            records_completed: 3,
            record_submitted: 3,
            chunks_completed: 2,
            chunks_submitted: 2,
            chunks_available: 0,
            workers_in_use: 42,
          },
        }),
      );
    }

    // Spark.batches.of('id').close()
    if (pathname === '/my-tenant/api/v4/batch/batch_uuid') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ object: 'batch', id: 'batch_uuid', meta: {} }));
    }
  }
}
