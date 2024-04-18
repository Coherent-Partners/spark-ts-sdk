<!-- markdownlint-disable-file MD024 -->

# Other APIs

| Verb                       | Description                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `Spark.wasm.download(uri)` | [Download a service's WebAssembly module](#download-a-services-webassembly-module). |
| `Spark.file.download(url)` | [Download a Spark file](#download-a-spark-file).                                    |

## Download a service's WebAssembly module

This method helps you download a service's [WebAssembly](https://webassembly.org/)
module.

Roughly speaking, WebAssembly (or WASM) is a binary instruction format
for a stack-based virtual machine. It's designed as a portable compilation target
for programming languages, enabling deployment on the web for client and server
applications.

In the context of Spark, a WebAssembly module refers to a cohesive bundle of
files designed for portability and execution across web and Node.js environments.
This bundle typically includes the WebAssembly representation of the Spark service's
encapsulated logic along with associated JavaScript files. By bundling these
components together, a Spark service becomes executable within both browser and
Node environments.

Check out the [API reference](https://docs.coherent.global/spark-apis/webassembly-module-api)
for more information.

### Arguments

You may pass in the service URI as `string` in the following format:

- `version/uuid` (e.g., `version/123e4567-e89b-12d3-a456-426614174000`) - **preferred**
- `service/uuid` (e.g., `service/123e4567-e89b-12d3-a456-426614174000`)
- `folder/service` (e.g., `my-folder/my-service`)

```ts
await spark.wasm.download('version/uuid');
```

Alternatively, you can pass in the following parameters as an `object`.

| Property    | Type     | Description                                      |
| ----------- | -------- | ------------------------------------------------ |
| _folder_    | `string` | The folder name.                                 |
| _service_   | `string` | The service name.                                |
| _versionId_ | `string` | The UUID of a particular version of the service. |
| _serviceId_ | `string` | The service UUID.                                |

> **NOTE**: As of now, only the `versionId` can be used to download the WebAssembly module.
> The other properties are currently being tested. Otherwise, they'll throw an `UnknownApiError`.

```ts
await spark.wasm.download({ versionId: '123e4567-e89b-12d3-a456-426614174000' });
```

### Returns

When successful, this method returns a buffer containing the WebAssembly module.
Here's an example in Node:

```ts
import { createWriteStream } from 'fs';
import Spark from '@cspark/sdk';

const spark = new Spark({ env: 'my-env', tenant: 'my-tenant', token: 'bearer token' });

spark.wasm
  .download('version/123e4567-e89b-12d3-a456-426614174000')
  .then((response) => {
    // write downloaded file to disk
    const file = createWriteStream('path/to/my-wasm-module.zip');
    response.buffer.pipe(file);
  })
  .catch(console.error);
```

The downloaded zip file should have the following files:

- `my-service.wasm`: the WebAssembly module with the service's logic
- `my-service.js`: the JavaScript glue code to interact with the WebAssembly module
- `my-service.data`: the service's static data (binary file)
- `my-serviceDefaultValidations.json`: the default or static validation schema
- `checksums.md5`: the checksums of the files in the zip (.data, .wasm, .js)
- `my-service_Jsonformspec.json` (optional): the service execution's JSON form specification
  (useful for generating UI elements such as input, select, etc.)

## Download a Spark file

Some Spark APIs may generate temporary files upon execution. This method helps you
download these files, which oftentimes require a valid token for access.

### Arguments

This method requires a valid URL as a `string`.

```ts
await spark.file.download('https://my-spark-file-url');
```

Some of the generated files carry a token for access in the URL. In such cases, you
can use a static method to download the file since it doesn't require a Spark instance.

```ts
import Spark from '@cspark/sdk';

await Spark.download('https://my-spark-file-url/with/token');
```

It should be noted that the `download` method is a static one and doesn't require
any Spark configuration. It also accepts a second argument, [Authorization](../src/auth.ts),
which can be used if user authorization is required to access and download a file.

```ts
import Spark, { Authorization } from '@cspark/sdk';

const auth = Authorization.from({ token: 'bearer token' });
await Spark.download('https://my-spark-file-url', auth);
```

### Returns

When successful, this method returns a buffer containing the file. You may then write
this buffer to disk (as shown above) or process it further.
