import http from 'http';
import { once } from 'events';
import { BaseUrl } from '@cspark/sdk/config';

// Use a custom BaseUrl for testing purposes.
export class TestBaseUrl extends BaseUrl {
  constructor(baseUrl: string, tenant: string) {
    // bypass the URL validation
    super(baseUrl, tenant);
  }
}

type ResponseHandler = (res: http.ServerResponse<http.IncomingMessage>) => void;

// A simple local server for testing purposes.
// Inspired by https://github.com/node-fetch/node-fetch/blob/main/test/utils/server.js
export default class LocalServer {
  private server: http.Server;
  nextResponseHandler?: ResponseHandler;

  constructor(readonly hostname: string = 'localhost') {
    this.server = http.createServer(this.router);
    this.server.keepAliveTimeout = 1000;
    this.server.on('error', (err) => console.log(err.stack));
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

  router(req: http.IncomingMessage, res: http.ServerResponse) {
    const pathname = req.url;

    // Spark.folder.getCategories()
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
  }
}
