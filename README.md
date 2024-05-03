# @cspark/sdk

[![npm version][version-img]][version-url]

The Coherent Spark Node.js SDK (currently in Beta) is designed to elevate the developer
experience and provide a convenient access to the Coherent Spark APIs.

👋 **Just a heads-up:**

This SDK isn't officially supported by Coherent. It originally started as a collection
of code snippets I built for demo purposes. I then thought, "Why not share it
with the community?" So, here we are!

If you encounter any bumps while using it, please report them
[here](https://github.com/c-spark/cspark-ts-sdk/issues) by creating a new issue.

## Installation

```bash
npm install @cspark/sdk
# or
yarn add @cspark/sdk
```

> 🫣 This package requires [Node.js 14.15](https://nodejs.org/en/download/current) or higher.

## Usage

To use the SDK, you need a Coherent Spark account that lets you access the following:

- User authentication ([API key][api-key-docs], [bearer token][bearer-token-docs]
  or [OAuth2.0 client credentials][oauth2-docs] details)
- Base URL (including the environment and tenant name)
- Spark service URI (to locate a specific resource):
  - `folder` - the folder name (where the service is located)
  - `service` - the service name
  - `version` - the semantic version a.k.a revision number (e.g., 0.4.2)

A `folder` contains one or more `service`s, and a `service` can have
multiple `version`s. Technically speaking, when you're operating with a service,
you're actually interacting with a specific version of that service (the latest
version by default - unless specified otherwise).

Hence, there are various ways to indicate a Spark service URI:

- `{folder}/{service}[?{version}]` - _version_ is optional.
- `service/{serviceId}`
- `version/{versionId}`

> **IMPORTANT:** Do **not** use URL-encoded characters in the service URI.

Here's an example of how to execute a Spark service:

```ts
import Spark from '@cspark/sdk';

function main() {
  const spark = new Spark({ env: 'my-env', tenant: 'my-tenant', apiKey: 'my-api-key' });

  spark.service
    .execute('my-folder/my-service', { inputs: { value: 'Hello, Spark SDK!' } })
    .then((response) => console.log(response.data))
    .catch(console.error);
}

main();
```

Though the package is designed for Node.js, it can also be used in browser-like
environments:

```html
<!doctype html>
<html>
  <body>
    <script src="https://www.unpkg.com/@cspark/sdk"></script>
    <script>
      const { SparkClient: Spark } = window['@cspark/sdk'];

      function main(apiKey) {
        const spark = new Spark({
          apiKey,
          env: 'my-env',
          tenant: 'my-tenant',
          allowBrowser: true,
        });

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

Explore the [examples](./examples/index.ts) and [documentation](./docs) folders
to find out more about the SDK's capabilities.

## Client Options

As shown in the examples above, the `Spark` client is your entry point to the SDK.
It is quite flexible and can be configured with the following options:

### Base URL

`baseUrl` (default: `process.env['CSPARK_BASE_URL']`): indicates the base URL of
the Coherent Spark APIs. It should include the tenant and environment information.

```ts
const spark = new Spark({ baseUrl: 'https://excel.my-env.coherent.global/my-tenant' });
```

Alternatively, a combination of `env` and `tenant` options can be used to construct
the base URL.

```ts
const spark = new Spark({ env: 'my-env', tenant: 'my-tenant' });
```

### Authentication

The SDK supports three types of authentication mechanisms:

- `apiKey` (default: `process.env['CSPARK_API_KEY']`): indicates the API key
  (also known as synthetic key), which is sensitive and should be kept secure.

```ts
const spark = new Spark({ apiKey: 'my-api-key' });
```

> **PRO TIP:**
> The Spark platform supports public APIs that can be accessed without any form
> of authentication. In that case, you need to set `apiKey` to `open` in order to
> create a `Spark` client.

- `token` (default: `process.env['CSPARK_BEARER_TOKEN']`): indicates the bearer token.
  It can be prefixed with 'Bearer' or not. A bearer token is usually valid for a
  limited time and should be refreshed periodically.

```ts
const spark = new Spark({ token: 'Bearer 123' });
```

- `oauth` (default: `process.env['CSPARK_CLIENT_ID']` and `process.env['CSPARK_CLIENT_SECRET']` or
  `process.env['CSPARK_OAUTH_PATH']`): indicates the OAuth2.0 client credentials.
  You can either provide the client ID and secret directly or provide the file path
  to the JSON file containing the credentials.

```ts
const spark = new Spark({ oauth: { clientId: 'my-client-id', clientSecret: 'my-client-secret' } });
// or
const spark = new Spark({ oauth: 'path/to/oauth/credentials.json' });
```

- `timeout` (default: `60000`): indicates the maximum amount of time (in milliseconds)
  that the client should wait for a response from Spark servers before timing out a request.

- `maxRetries` (default: `2`): indicates the maximum number of times that the client
  will retry a request in case of a temporary failure, such as a unauthorized
  response or a status code greater than 400.

- `retryInterval` (default: `1` second): indicates the delay between each retry.

- `allowBrowser` (default: `false`): indicates whether the SDK should be used in
  browser-like environments -- unless you intend to access public APIs.
  By default, client-side use of this library is not recommended as it risks
  exposing your secret API credentials to attackers.
  Only set this option to `true` if you understand the risks and have appropriate
  mitigations in place.

- `logger` (default: `LoggerOptions`): enables or disables the logger for the SDK.
  - If `boolean`, determines whether or not the SDK should print logs.
  - If `LogLevel | LogLevel[]`, the SDK will only print logs that match the specified level or higher.
  - If `LoggerOptions`, the SDK will print messages with the specified options:
    - `context` (default: `CSPARK v{version}`): defines the context of the logs (e.g., `CSPARK v1.2.3`);
    - `colorful` (default: `true`): determines whether the logs should be colorful;
    - `timestamp` (default: `true`): determines whether the logs should include timestamps;
    - `logLevels` (default: `['verbose', 'debug', 'log', 'warn', 'error', 'fatal']`):
      determines the log levels to print;
    - `logger`: a custom logger that implements the `LoggerService` interface.

```ts
const spark = new Spark({ logger: false });
// or
const spark = new Spark({ logger: 'warn' }); // or ['warn', 'error']
// or
const spark = new Spark({ logger: { colorful: false } });
```

## Client Errors

`SparkError` is the base class for all custom errors thrown by the SDK. There are
two types of it:

- `SparkSdkError`: usually thrown when an argument (user entry) fails to comply
  with the expected format. Because it's a client-side error, it will include in
  the majority of cases the invalid entry as `cause`.
- `SparkApiError`: when attempting to communicate with the API, the SDK will wrap
  any sort of failure (any error during the roundtrip) into `SparkApiError`, which
  includes the HTTP `status` code of the response and the `requestId`, a unique
  identifier of the request.

Some of the derived `SparkApiError` are:

| Type                      | Status      | When                           |
| ------------------------- | ----------- | ------------------------------ |
| `InternetError`           | 0           | no internet access             |
| `BadRequestError`         | 400         | invalid request                |
| `UnauthorizedError`       | 401         | missing or invalid credentials |
| `ForbiddenError`          | 403         | insufficient permissions       |
| `NotFoundError`           | 404         | resource not found             |
| `ConflictError`           | 409         | resource already exists        |
| `RateLimitError`          | 429         | too many requests              |
| `InternalServerError`     | 500         | server-side error              |
| `ServiceUnavailableError` | 503         | server is down                 |
| `ApiUnknownError`         | `undefined` | unknown error                  |

## API Parity

The SDK aims to provide over time full parity with the Spark APIs. Below is a list
of the currently supported APIs.

[Authentication API](./docs/authentication.md) - manages access tokens using
OAuth2.0 Client Credentials flow:

- `Authorization.oauth.retrieveToken(config)` generates new access token.
- `Authorization.oauth.refreshToken(config)` refreshes access token when expired.

[Folder API](./docs/folder.md) - manages folders:

- `Spark.folder.getCategories()` gets the list of folder categories.
- `Spark.folder.create(data)` creates a new folder using info such as name, description, category, etc.
- `Spark.folder.find(name)` finds folders by name, status, category, or favorite.
- `Spark.folder.update(id, data)` updates a folder's information by id.
- `Spark.folder.delete(id)` deletes a folder by id.

[Service API](./docs/service.md) - manages Spark services:

- `Spark.service.create(data)` creates a new Spark service.
- `Spark.service.execute(uri, data)` executes a Spark service.
- `Spark.service.batch.execute(uri, data)` executes multiple records synchronously.
- `Spark.service.getVersions(uri)` lists all the versions of a service.
- `Spark.service.getSwagger(uri)` gets the Swagger documentation of a service.
- `Spark.service.getSchema(uri)` gets the schema of a service.
- `Spark.service.getMetadata(uri)` gets the metadata of a service.
- `Spark.service.download(uri)` downloads the excel file of a service.
- `Spark.service.recompile(uri)` recompiles a service using specific compiler versions.
- `Spark.service.validate(uri, data)` validates input data using static or dynamic validations.
- `Spark.service.export(uri)` exports Spark services as a zip file.
- `Spark.service.import(data)` imports Spark services from a zip file into the Spark platform.

[Log History API](./docs/history.md) - manages service execution logs:

- `Spark.service.log.rehydrate(uri, callId)` rehydrates the executed model into the original Excel file.
- `Spark.service.log.download(uri, [type])` downloads service execution logs as `csv` or `json` file.

[ImpEx API](./docs/impex.md) - imports and exports Spark services:

- `Spark.impex.export(data)` exports Spark entities (versions, services, or folders).
- `Spark.impex.import(data)` imports previously exported Spark entities into the Spark platform.

[Other APIs](./docs/misc.md) - for other functionalities:

- `Spark.wasm.download(uri)` downloads a service's WebAssembly module.
- `Spark.file.download(url)` downloads temporary files issued by the Spark platform.

> **PRO TIP:**
> A service URI locator can be combined with other parameters to locate a specific
> service (or version of it) when it's not a string. For example, you may execute
> a public service using an object containing the `folder`, `service`, and `public`
> properties.

```ts
const spark = new Spark({ env: 'my-env', tenant: 'my-tenant', apiKey: 'open' });
const uri = { folder: 'my-folder', service: 'my-service', public: true };
const inputs = { value: 'Hello, Spark SDK!' };

spark.service
  .execute(uri, { inputs })
  .then((response) => console.log(response.data))
  .catch(console.error);
// The final URI in this case is: 'my-tenant/api/v3/public/folders/my-folder/services/my-service/execute'
```

See the [Uri](./src/resources/base.ts) class for more details.

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
