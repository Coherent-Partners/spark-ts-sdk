# Authentication

The SDK supports three types of authentication mechanisms:

- `apiKey`
- `token`
- `oauth` (recommended method for production)

## API Key

A Spark API key is a synthetic key that allows you to authenticate to the platform
and access the following APIs:

- [Batch APIs][batch-apis]
- [Execute API][execute-api]
- [Metadata API][metadata-api]
- [Validation API][validation-api]

If and when you need that API key to access additional APIs, you need to review and
configure [feature permissions][feature-permissions] in the Spark platform. Find
out more on how to generate and manage API keys in the [Spark documentation][spark-api-keys].

Keep in mind that API keys are sensitive and should be kept secure. Therefore, we
strongly recommend reading [this article][openai-api-keys] by OpenAI on best practices
for API key safety.

### Setting the API Key in Node Environments

To create a `SparkClient` instance with an API key, you can provide the key
directly or set it in the environment variable `CSPARK_API_KEY`:

```ts
const spark = new Spark({ apiKey: 'my-api-key' });
```

When accessing publicly available APIs, you do not require an API key or any
other authentication mechanism. In fact, you can create a `SparkClient` instance
without providing any authentication mechanism by setting the `apiKey` to `open`:

```ts
const spark = new Spark({ apiKey: 'open' });
```

> [!TIP]
> You may read that API key later from the `SparkClient` instance if needed:

```ts
const spark = new Spark();

// the client options are available in the `config`uration property
console.log(spark.config.auth.apiKey);
```

### Setting the API Key in Browser Environments

By default, client-side use of this SDK is not recommended as it risks exposing
your secret API credentials to attackers. However, the `allowBrowser` option can
be used to bypass this restriction. When set to `true`, the SDK will assume you
understand the risks and let you proceed.

```ts
const { SparkClient: Spark } = window['@cspark/sdk'];

const spark = new Spark({ apiKey: 'my-api-key', allowBrowser: true });
```

> [!NOTE]
> The `allowBrowser` option is unnecessary if you intend to access publicly
> available APIs (such as when `apiKey` is set to `open`).

## Bearer Token

A bearer token (or simply token) is a short-lived JSON Web token (JWT) that allows you
to authenticate to the Spark platform and access its APIs. Follow [this guide][bearer-token] to
learn how to access your bearer token.

Keep in mind that a bearer token is usually prefixed with 'Bearer'. However, the
SDK will automatically add the prefix if it is not provided. You can provide a bearer
token directly or set it in the environment variable `CSPARK_BEARER_TOKEN`.

```ts
const spark = new Spark({ token: 'Bearer my-access-token' });
```

## Client Credentials Grant

The [OAuth2.0 client credentials grant][oauth2] is the preferred way to handle user authentication
and authorization in the Spark platform. To use this grant, you need to provide the
client ID and secret or the path to the JSON file containing the credentials.

Using the client ID and secret directly:

```ts
const oauth = { clientId: 'my-client-id', clientSecret: 'my-client-secret' };
const spark = new Spark({ oauth });
```

Alternatively, you can provide the path to the JSON file containing the client ID
and secret:

```ts
const spark = new Spark({ oauth: 'path/to/my/credentials.json' });
```

## Using Environment Variables (recommended)

As you already know, the SDK will attempt to read the API key, bearer token, and
OAuth credentials from the environment variables. This is the recommended way to
store your sensitive information.

```bash
export CSPARK_API_KEY='my-api-key'
# or
export CSPARK_BEARER_TOKEN='Bearer your access token'
# or
export CSPARK_CLIENT_ID='my-client-id'
export CSPARK_CLIENT_SECRET='my-client-secret'
# or
export CSPARK_OAUTH_PATH='path/to/my/client-credentials.json'
```

Creating a `SparkClient` instance now becomes as simple as:

```ts
const spark = new Spark();
```

## Good to know

When using OAuth2.0 client credentials grant, the SDK will automatically refresh
the token when it expires. However, you can also generate or refresh the token manually. Here's
how you can do it:

```ts
const spark = new Spark({ oauth: 'path/to/my/credentials.json' });
await spark.config.auth.oauth?.retrieveToken(spark.config);

// the access token is now available in the configuration
console.log(`access token: ${spark.config.auth.oauth?.accessToken}`);
```

If more than one authentication mechanisms are provided, the SDK will prioritize in
the following order: API key > Bearer token > and OAuth2.0 client credentials grant.

[batch-apis]: https://docs.coherent.global/spark-apis/batch-apis
[execute-api]: https://docs.coherent.global/spark-apis/execute-api
[metadata-api]: https://docs.coherent.global/spark-apis/metadata-api
[validation-api]: https://docs.coherent.global/spark-apis/validation-api
[feature-permissions]: https://docs.coherent.global/spark-apis/authorization-api-keys/permissions-features-permissions
[openai-api-keys]: https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety
[spark-api-keys]: https://docs.coherent.global/spark-apis/authorization-api-keys
[bearer-token]: https://docs.coherent.global/spark-apis/authorization-bearer-token
[oauth2]: https://docs.coherent.global/spark-apis/authorization-client-credentials
