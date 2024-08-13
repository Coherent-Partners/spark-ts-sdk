import http from 'http';
import { once } from 'events';
import { Config } from '@cspark/sdk/config';
import { ApiResource, Uri, BaseUrl } from '@cspark/sdk';

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
  }
}
