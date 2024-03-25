# @cspark/sdk

[![npm version][version-img]][version-url]

## Description

The Coherent Spark Node.js SDK (currently in Beta), designed to elevate the developer
experience and provide a convenient access to the Coherent Spark API.

> **NOTE**: This package requires Node.js 16 or higher.

## Installation

```bash
npm install @cspark/sdk
# or
yarn add @cspark/sdk
```

## Usage

To use the SDK, you need a Coherent Spark account that lets you access the following:

- User authentication ([API key][api-key-docs], [bearer token][bearer-token-docs]
  or [OAuth2 client credentials][oauth2-docs] details)
- Base URL (including the tenant and environment)
- Spark service URI (to locate a specific resource):
  - `folder` - a collection of services
  - `service` - a specific service
  - `version` - a specific version of a service

Here's an example of how to execute a Spark service:

```ts
import Spark from '@cspark/sdk';

async function main() {
  const spark = new Spark({ env: 'uat.us', tenant: 'my-tenant', apiKey: 'my-api-key' });
  spark.service
    .execute('my-folder/my-service', { inputs: { value: 'Hello, Spark SDK!' } })
    .then((response) => console.log(response.data))
    .catch(console.error);
}

main();
```

There are different ways to indicate a Spark service URI:

- `{folder}/{service}[?{version}]` - _version_ is optional.
- `service/{serviceId}`
- `version/{versionId}`

Though the package is designed for Node.js, it can also be used in browser-like
environments:

```html
<!doctype html>
<html>
  <body>
    <script src="https://www.unpkg.com/@cspark/sdk"></script>
    <script>
      const { SparkClient: Spark } = window['@cspark/sdk'];

      async function main(apiKey) {
        const spark = new Spark({ env: 'uat.us', tenant: 'my-tenant', apiKey, allowBrowser: true });
        spark.service
          .execute('my-folder/my-service', { inputs: { value: 'Hello, Spark SDK!' } })
          .then((response) => console.log(response.data))
          .catch(console.error);
      }

      main(prompt('Provide your API key'));
    </script>
  </body>
</html>
```

Explore the [examples](./examples/index.ts) folder to find out more about the SDK's capabilities.

## Client Options

As shown in the example above, `Spark` is your entry point to the SDK. It is quite
flexible and can be configured with the following options:

### Base URL

`baseUrl` - default: `process.env['CSPARK_BASE_URL']`: indicates the base URL of
the Coherent Spark API. It should include the tenant and environment information.

```ts
const spark = new Spark({ baseUrl: 'https://excel.uat.us.coherent.global/my-tenant' });
```

Alternatively, a combination of `env` and `tenant` options can be used to construct
the base URL.

```ts
const spark = new Spark({ env: 'uat.us', tenant: 'my-tenant' });
```

### Authentication

The SDK supports three types of authentication mechanisms:

- `apiKey` - default: `process.env['CSPARK_API_KEY']`: indicates the API key
  (also known as synthetic key). Keep in mind that the API key
  is sensitive and should be kept secure.

```ts
const spark = new Spark({ apiKey: 'my-api-key' });
```

- `token` - default: `process.env['CSPARK_BEARER_TOKEN']`: indicates the bearer token.
  It can be prefixed with 'Bearer' or not. A bearer token is usually valid for a
  limited time and should be refreshed periodically.

```ts
const spark = new Spark({ token: 'Bearer 123' });
```

- `oauth` - default: `process.env['CSPARK_CLIENT_ID']` and `process.env['CSPARK_CLIENT_SECRET']` or
  `process.env['CSPARK_OAUTH_PATH']`: indicates the OAuth2 client credentials.
  For convenience, you can provide the client ID and secret directly or provide
  the file path to the JSON file containing the credentials.

```ts
const spark = new Spark({ oauth: { clientId: 'my-client-id', clientSecret: 'my-client' } });
// or
const spark = new Spark({ oauth: 'path/to/credentials.json' });
```

- `timeout` - default: `60000`: indicates the maximum amount of time (in milliseconds)
  that the client should wait for a response from Spark servers before timing out a request.

- `maxRetries` - default: `2`

Indicates the maximum number of times that the client will retry a request in case of a
temporary failure, such as a unauthorized response or a status code greater than 400.

- `allowBrowser` - default: `false`: indicates whether the SDK should be used in
  browser-like environments. By default, client-side use of this library is not
  recommended, as it risks exposing your secret API credentials to attackers.
  Only set this option to `true` if you understand the risks and have appropriate
  mitigations in place.

## Error Handling

`SparkError` is a base class for all custom errors. There are two types of errors:

- `SparkSdkError`: usually thrown when an argument (user input) fails to comply
  with the expected format. Because it's a client-side error, it will include in
  the majority of cases the invalid entry as `cause`.
- `SparkApiError`: when attempting to communicate with the API, the SDK will wrap
  any sort of failure (any error during the round trip) into `SparkApiError`.
  The `status` will be the HTTP status code of the response, and the `requestId`
  will be the unique identifier of the request.

Some of the derived `SparkApiError` are:

| type                      | status      | when                           |
| ------------------------- | ----------- | ------------------------------ |
| `InternetError`           | 0           | no internet access             |
| `BadRequestError`         | 400         | invalid request                |
| `UnauthorizedError`       | 401         | missing or invalid credentials |
| `ForbiddenError`          | 403         | insufficient permissions       |
| `NotFoundError`           | 404         | resource not found             |
| `RateLimitError`          | 429         | too many requests              |
| `InternalServerError`     | 500         | server-side error              |
| `ServiceUnavailableError` | 503         | server is down                 |
| `ApiUnknownError`         | `undefined` | unknown error                  |

## Contributing

Feeling motivated enough to contribute? Great! Your help is always appreciated.

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on the code of
conduct, and the process for submitting pull requests.

## Copyright and License

[Apache-2.0](./LICENSE)

<!-- References -->

[version-img]: https://img.shields.io/npm/v/@cspark/sdk
[version-url]: https://www.npmjs.com/package/@cspark/sdk
[api-key-docs]: https://docs.coherent.global/spark-apis/authorization-api-keys
[bearer-token-docs]: https://docs.coherent.global/spark-apis/authorization-bearer-token
[oauth2-docs]: https://docs.coherent.global/spark-apis/authorization-client-credentials
