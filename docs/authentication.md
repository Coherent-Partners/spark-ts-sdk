# Authentication

The SDK supports three types of security schemes:

- [API key](#api-key)
- [Bearer token](#bearer-token)
- [OAuth2.0 Client Credentials](#client-credentials-grant) (recommended method for production)

## API Key

A Spark API key is a synthetic key that allows you to authenticate to the platform
and access the following APIs:

- [Execute API][execute-api]
- [Batch API][batch-apis]
- [Metadata API][metadata-api]
- [Validation API][validation-api]

If and when you need that API key to access additional APIs, you'll have to review and
configure [feature permissions][feature-permissions] in the Spark platform. Find
out more on how to generate and manage API keys in [Spark's User Guide][spark-api-keys].

Remember that API keys are sensitive and should be kept secure. Therefore, we
strongly recommend reading [this article][openai-api-keys] by OpenAI on best practices
for API key safety.

### Setting the API Key in Node Environments

To create a `SparkClient` instance with an API key, you can provide the key
directly or set it in the environment variable `CSPARK_API_KEY`:

```ts
const spark = new Spark({ apiKey: 'my-api-key' });
```

When accessing publicly available APIs, Spark does not require an API key or any
other authentication mechanism. Hence, you can create a `SparkClient` instance
without providing any authentication mechanism by setting the `apiKey` to `open`.

> You should keep in mind that this is internal to the SDK. Spark APIs will not know
> how to handle this value.

```ts
const spark = new Spark({ apiKey: 'open' });
```

> [!WARNING]
> You will not be able to read that API key later from the `SparkClient` instance
> if needed. It's masked for security reasons.

```ts
const spark = new Spark();

// the client options are available in the `config` property
console.log(spark.config.auth.apiKey); // '****-rest-of-key'
```

### Setting the API Key in Browser Environments

By default, client-side use of this SDK is not recommended as it risks exposing
your secret API credentials to attackers. But, the `allowBrowser` option can
be used to bypass this restriction. When set to `true`, the SDK will assume you
understand the risks and let you proceed.

```ts
const { SparkClient: Spark } = window['@cspark/sdk'];

const spark = new Spark({ apiKey: 'my-api-key', allowBrowser: true });
// or
const spark = new Spark({ apiKey: 'open' });
```

> [!NOTE]
> The `allowBrowser` option is unnecessary if you intend to access publicly
> available APIs (such as when `apiKey` is set to `open`).

## Bearer Token

A bearer token (or simply token) is a short-lived JSON Web token (JWT) that allows you
to authenticate to the Spark platform and access its APIs. Follow [this guide][bearer-token] to
learn how to access your bearer token.

Sometimes, a bearer token is prefixed with the word 'Bearer'. But the SDK will know
how to handle it whether you choose it to prefix your token or not. You can set a
token directly or define it in the environment variable `CSPARK_BEARER_TOKEN`.

```ts
const spark = new Spark({ token: 'Bearer my-access-token' });
```

The bearer token also carry additional Spark settings that can be extracted and simplify
the creation of a `SparkClient` instance. To harness this capability, you're required
to install this [jwt-decode] NPM package. Also, this is not supported in the browser environment.

```ts
import { JwtConfig } from '@cspark/sdk';

const spark = new Spark(JwtConfig.from({ token: 'Bearer my-access-token', maxRetries: 3 }));
// or
const spark = new Spark(JwtConfig.decode('Bearer my-access-token'));
```

Note that `JwtConfig` is simply an extension of `Spark.Config`. So other client options
can be specified as well if needed. In short, the SDK will automatically try to extract
settings like the base URL and tenant name from the token.

## Client Credentials Grant

The [OAuth2.0 client credentials grant][oauth2] is the preferred way to handle user authentication
and authorization in the Spark platform. To use this grant, you should provide both the
client ID and secret or the path to the JSON file containing them.

Using the client ID and secret directly:

```ts
const oauth = { clientId: 'my-client-id', clientSecret: 'my-client-secret' };
const spark = new Spark({ oauth });
```

Or, you may provide the path to the JSON file containing the client ID and secret:

```ts
const spark = new Spark({ oauth: 'path/to/my/credentials.json' });
```

## Using Environment Variables (recommended)

As you already know, the SDK will attempt to read the API key, bearer token, and
OAuth credentials from the environment variables. This is the recommended way to
store your sensitive information.

**Method 1**: Here's how you can export the environment variables in a Unix-like shell:

```bash
export CSPARK_BASE_URL='https://excel.my-env.coherent.global/my-tenant'
# and
export CSPARK_API_KEY='my-api-key'
# or
export CSPARK_BEARER_TOKEN='Bearer my-access-token'
# or
export CSPARK_CLIENT_ID='my-client-id'
export CSPARK_CLIENT_SECRET='my-client-secret'
# or
export CSPARK_OAUTH_PATH='path/to/my/client-credentials.json'
```

**Method 2** (preferred): You can use a `.env` file to store your environment
variables and use a package like [dotenv] to load them into your application.
Creating a `SparkClient` instance now becomes as simple as:

```ts
const spark = new Spark();
```

> [!WARNING]
> Please note that you should never commit your `.env` file to a public repository.

## Good to Know

When using OAuth2.0 client credentials, the SDK will automatically refresh the
bearer token when it expires. You can also generate or refresh the token manually.

```ts
const spark = new Spark({ oauth: 'path/to/my/credentials.json' });
await spark.config.auth.oauth?.retrieveToken(spark.config);

// the access token is now available in the configuration
console.log(`access token: ${spark.config.auth.oauth?.accessToken}`);
```

If more than one authentication mechanism are provided, the SDK will prioritize in
the following order: OAuth2.0 client credentials grant > API key > Bearer token.

[Back to top](#authentication) or [Next: Folders API](./folders.md)

[batch-apis]: https://docs.coherent.global/spark-apis/batch-apis
[execute-api]: https://docs.coherent.global/spark-apis/execute-api
[metadata-api]: https://docs.coherent.global/spark-apis/metadata-api
[validation-api]: https://docs.coherent.global/spark-apis/validation-api
[feature-permissions]: https://docs.coherent.global/spark-apis/authorization-api-keys/permissions-features-permissions
[openai-api-keys]: https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety
[spark-api-keys]: https://docs.coherent.global/spark-apis/authorization-api-keys
[bearer-token]: https://docs.coherent.global/spark-apis/authorization-bearer-token
[oauth2]: https://docs.coherent.global/spark-apis/authorization-client-credentials
[jwt-decode]: https://www.npmjs.com/package/jwt-decode
[dotenv]: https://www.npmjs.com/package/dotenv
