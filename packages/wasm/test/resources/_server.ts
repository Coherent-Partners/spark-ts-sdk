import http from 'http';
import { once } from 'events';
import { BaseUrl } from '@cspark/sdk';

// Use a custom BaseUrl for testing purposes.
export class TestBaseUrl extends BaseUrl {
  constructor(baseUrl: string, tenant: string) {
    // bypass the URL validation
    super(baseUrl, tenant);
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

    // Client.health.check()
    if (pathname === '/healthcheck') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end('{"msg":"ok"}');
    }

    // Client.version.get()
    if (pathname === '/version') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end('{ "lastPullDate": "1970-01-23T03:43:46.333Z", "filehash": "uuid", "version": "1.40.2" }');
    }

    // Client.services.execute('f/s')
    if (pathname === '/my-tenant/api/v3/folders/f/services/s/execute') {
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

    // Client.services.execute('f/s', inputs)
    if (pathname === '/my-tenant/api/v3/public/folders/f/services/s/execute') {
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

    // Client.services.execute('f/s', [inputs])
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
  }
}
