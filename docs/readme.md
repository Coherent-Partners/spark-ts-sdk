# SDK Documentation

This guide should serve as a comprehensive reference for the SDK. It covers all
the verbs (or methods) and parameters available in the SDK.

There's no need to look up API-related information on Spark's [User Guide](https://docs.coherent.global).
The SDK provides a simple interface to interact with Spark's supported APIs,
which shall help you save time and streamline your development process.

## Table of Contents

- [Authentication](./authentication.md)
- [Folder API](./folder.md)
- [Service API](./service.md)
- [Log History API](./history.md)
- [ImpEx API](./impex.md)
- [Other APIs](./misc.md)

## Getting Started

### EcmaScript Modules (ESM) vs CommonJS (CJS)

The SDK is written in TypeScript and compiled to both EcmaScript Modules (ESM) and
CommonJS (CJS) formats. You may import the SDK in your project using either of these
formats.

**Using ESM:**

```ts
import Spark from '@cspark/sdk';
```

**Or using CJS:**

```ts
const { SparkClient: Spark } = require('@cspark/sdk');
```

To avoid confusion and maintain consistency across the examples used in the SDK
documentation, the ESM format will be used in all the code snippets.

### Spark URI Locator

You may notice by now that the `folder` and `service` when combined together
form a base identifier to locate a resource in the Spark platform for a particular
environment and tenant. I term this _Spark URI Locator_.

Given that the locator may be part of both the final URL or the request payload,
it is recommended to use non-URL encoded strings when referring its identifiers.
The SDK will take care of encoding them when necessary. Otherwise, you risk
encountering issues when trying to locate a resource.

Let's say you want to execute a Spark service using the `my folder` and `my service`
identifiers.

```ts
const folder = 'my%20folder'; // encoding equivalent to 'my folder'
const service = 'my%20service'; // encoding equivalent to 'my service'

// Use case 1: as part of the URL
await spark.service.execute(
  { folder, service },
  {
    /* data */
  },
);

// Use case 2: as part of the payload
await spark.service.batch.execute(
  { folder, service },
  {
    /* data */
  },
);
```

Behind the scenes, the `Spark.service.execute` uses the URI locator as part of
the final URL to locate the service to execute. Hence, it works fine whether the
identifiers are URL encoded or not. However, when using the `Spark.service.batch.execute`,
the method uses the URI locator as part of the payload, which will fail to locate
the service if the identifiers are URL encoded. Therefore, it is recommended to
use non-URL encoded strings when referring to these identifiers.

### Transactional vs Non-Transactional Methods

Most of the SDK methods are non-transactional, meaning that a request is expected
to perform one task only (i.e, hitting one Spark endpoint only). In short, a
stateless roundtrip.
However, for convenience purposes, some of the methods can execute a series of
tasks, handle their internal states, and return the final result in a single call
(or _transaction)_.

For example:

- `Spark.folder.create(data)` will create a folder and upload a cover image (if any)
  in separate requests.
- `Spark.service.create(data)` will upload an excel file, check its status until
  completion, and publish it as a Spark service.
- `Spark.impex.export(data)` will initiate an export job, check its status until
  completion, and download a zip containing all the necessary files associated
  with a Spark service.

> **PRO TIP**: You may notice multiple requests being made in the logs (if enabled)
> when using these methods.

These transactional methods are quite useful as they will handle the entire process
for you, from start to finish. Unfortunately, they may take a bit longer to complete.
Therefore, you are welcome to use non-transactional methods for more fine-grained
control over the process.

## HTTP Request

The SDK is shipped with a built-in logger that will log all HTTP requests
to the console by default. If you want to disable this feature, you can set
the `logger` property to `false` or to higher log levels (e.g., `warn`) in the
SDK configuration.

```ts
const spark = new Spark({ logger: false });
```

The log level for the HTTP requests is `debug`. Keep in mind that setting the
`logger` property to `false` will disable all logs, including errors and warnings.

You may provide a custom logger to the SDK by setting the `logger` property of the
`LoggerOptions` to an instance of a class that implements the `LoggerService`
interface. Your logger will take precedence over the built-in logger.

```ts
import Spark from '@cspark/sdk';

const logger = {
  debug: (message: string) => console.log(message),
  warn: (message: string) => console.warn(message),
  error: (message: string) => console.error(message),
};

const spark = new Spark({ logger: { logger } });
```

## HTTP Response

All the methods return a `Promise` that resolves to an `HttpResponse<T>` object
where `T` is the type of the data returned by the API.

- `status`: HTTP status code
- `data`: JSON data `T` returned by the API
- `buffer`: Binary array buffer of response body
- `headers`: Response headers

**Example:**

```json
{
  "status": 200,
  "data": {},
  "buffer": null,
  "headers": {}
}
```

## HTTP Error

When attempting to communicate with the API, the SDK will wrap any sort of failure
(any error during the roundtrip) into a `SparkApiError`, which will include
the HTTP `status` code of the response and the `requestId`, a unique identifier
of the request. The most common errors are:

- `UnauthorizedError`: when the user is not authenticated/authorized
- `NotFoundError`: when the requested resource is not found
- `BadRequestError`: when the request or payload is invalid
- `ConflictError`: when a resource is duplicated or conflicting

The following properties are available in a `SparkApiError`:

- `name`: name of the API error, e.g., `UnauthorizedError`
- `status`: HTTP status code
- `cause`: cause of the failure
- `message`: summary of the error message causing the failure
- `requestId`: unique identifier of the request (useful for debugging)
- `details`: a stringified version of `cause`.

The `cause` property will include key information regarding the attempted request
as well as the obtained response if available.

**Example:**

```json
{
  "name": "UnauthorizedError",
  "status": 401,
  "message": "failed to fetch <URL>",
  "cause": {
    "request": {
      "url": "https://excel.my-env.coherent.global/api/v1/product/delete/uuid",
      "method": "DELETE",
      "headers": {
        "User-Agent": "Coherent Spark SDK v0.1.0 (Node/16.14.2)",
        "x-spark-ua": "agent=cspark-ts-sdk/0.1.0; env=Node/16.14.2",
        "x-request-id": "uuid",
        "x-tenant-name": "my-tenant",
        "Content-Type": "application/json"
      },
      "body": "null"
    },
    "response": {
      "headers": {
        "connection": "close",
        "content-length": "0",
        "date": "Thu, 01 Jan 1970 01:23:45 GMT",
        "strict-transport-security": "max-age=15724800; includeSubDomains",
        "www-authenticate": "Bearer"
      },
      "body": null,
      "raw": ""
    }
  }
}
```

## API Resource

The Spark platform offers a wide range of functionalities that can be accessed
programmatically via RESTful APIs. There are over 60 endpoints available, and the
SDK currently supports about 1/3 of them.

Even though the SDK does not cover all the APIs available in the platform, it provides
a good starting point for developers to interact with it. So, if there's an API resource
that you need to consume and it is not available in the SDK, you can always extend
this `ApiResource` class to include it. Here's an example of how you can do it:

```ts
import Spark, { ApiResource, Uri } from '@cspark/sdk';

// 1. Prepare the additional API resource you want to consume (e.g., MyResource).
class MyResource extends ApiResource {
  fetchData() {
    const url = Uri.from(undefined, {
      base: this.config.baseUrl.full,
      version: 'api/v4',
      endpoint: 'my/resource',
    });

    return this.request(url, { method: 'GET' });
  }
}

// 2. Build a Spark client.
const spark = new Spark({ env: 'my-env', tenant: 'my-tenant', token: 'bearer token' });

// 3. Your custom resource relies on the Spark configuration to build the request.
const myResource = new MyResource(spark.config);

// 4. Use the custom resource to fetch data.
myResource.fetchData().then((response) => {
  // 5. do something with the response.
  console.log(response.data);
});
```

Did you notice the `this.config` property and the `this.request(...)` method in the
`MyResource` class? These are inherited from the `ApiResource` class and are
available for you to use in your custom resource. The `config` property contains
some other goodies like the `baseUrl`, which can be used to build other URLs
supported by the Spark platform.

The `Uri` class is also available to help you build the URL for your custom resource.
In this particular example, the built URL will be: `https://excel.my-env.coherent.global/my-tenant/api/v4/my/resource`.

### Error Handling

The SDK will only throw `SparkError` errors when something goes wrong unless a request gets aborted.
Whether you choose to use `async-await` or `promise-chaining`, you should always handle
these errors to avoid disrupting the flow of your application.

```ts
import Spark, { SparkError } from '@cspark/sdk';

async function main(folderName) {
  try {
    const spark = new Spark(); // settings are loaded from the environment variables
    const response = await spark.folder.create(folderName);

    // when successful, do something with the response
    console.log(response.data);
  } catch (error) {
    if (error instanceof SparkError) {
      console.warn(error.details); // this is thrown by the SDK

      if (error.status === 409 || error.name === 'ConflictError') {
        console.log('folder already exists; trying again with a different name');
        await main(`${folderName}-1`);
      }
    } else {
      console.error(error); // this is thrown by something else
    }
  }
}

main('my-folder');
```

By the way, you may import the `Logger` class from the SDK to help you with a more
structured, consistent way of logging errors and other messages in your application.

```ts
import { Logger } from '@cspark/sdk';

const logger = Logger.of(/* logger options if needed */);
logger.error('something went wrong');
```

### File Handling

There are various ways of handling files in both Node and Browser environments.
To keep things simple and easy, the following ways are recommended:

- **In Node environments**, you can use the `fs` (file system) module to read and write
  files from/to disks. The recommended way to read and write files is to use the
  `createReadStream` and `createWriteStream` methods, respectively. Below is an
  example of how to create a folder with a cover image:

```ts
import { createReadStream } from 'fs';

const file = createReadStream('path/to/image.png'); // be mindful of the OS.
const cover = { image: file, fileName: 'image.png' };

// omit Spark initialization for brevity
await spark.folder.create({ name: 'my-folder', cover });
```

- **In Browser environments**, you may use the `File` object to read files. Here's
  the same example as above but for the browser environment:

```html
<body>
  <input type="file" id="file-input" />
  <button onclick="createFolder()">Create Folder</button>
  <script>
    async function createFolder() {
      const inputRef = document.getElementById('file-input');
      const file = inputRef.files[0];
      if (!file) return;

      const cover = { image: file, fileName: file.name };

      // omit Spark initialization for brevity
      await spark.folder.create({ name: 'my-folder', cover });
    }
  </script>
</body>
```

## Support and Feedback

The SDK is a powerful tool that will help you interact with the Spark platform
in a more efficient and streamlined way. It is built to help you save time and
focus on what matters most: integrating Spark into your applications.

If you have any questions or need help with the SDK, feel free to create an issue
or submit a pull request following these [guidelines](../CONTRIBUTING.md).

Happy coding! 🚀
