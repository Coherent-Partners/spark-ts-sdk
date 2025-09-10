<!-- markdownlint-disable-file MD024 -->

# Other APIs

| Verb                        | Description                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| `Spark.health.check()`      | [Check the health status of a Spark environment](#check-the-health-status-of-a-spark-environment). |
| `Spark.config.get()`        | [Fetch the platform configuration](#fetch-the-platform-configuration).                             |
| `Spark.wasm.download(uri)`  | [Download a service's WebAssembly module](#download-a-services-webassembly-module).                |
| `Spark.files.download(url)` | [Download a Spark file](#download-a-spark-file).                                                   |

## Check the health status of a Spark environment

This method checks the health status of a Spark environment as described in the
[API reference](https://docs.coherent.global/integrations/diagnose-spark-connectivity).

### Arguments

This method does not require any arguments as it relies on the current `Spark.Config` (i.e., `env`,
`tenant`, or `base_url`) to determine which Spark environment to check.

```ts
import { SparkClient } from '@cspark/sdk';

const client = new SparkClient({ baseUrl: 'https://my-env.coherent.global/my-tenant', token: 'open' });
client.health.check().then((response) => console.log(response.data));
```

> [!NOTE]
> Actually, no authentication is required to check the health status of a Spark environment.
> A convenient way to do this without the need for a client instance is to use the
> `SparkClient.healthCheck(url)` static method, where `url` can either be the base
> URL or the environment/region name.

```ts
import { SparkClient } from '@cspark/sdk';

SparkClient.healthCheck('my-env').then((response) => console.log(response.data));
```

### Returns

When successful, this method returns an object containing the health status of the
Spark environment.

```json
{ "status": "UP" }
```

> [!TIP]
> You can simply use the `Spark.health.ok()` method to check if the Spark environment
> is healthy. This method returns a boolean value indicating whether the environment
> is up and running or not.

## Fetch the platform configuration

The platform or Spark configuration refers to the SaaS configuration for the current
tenant (and user), which includes information such as batch size, timeout, supporter
compilers, etc.

### Arguments

This method does not require any arguments and will fetch the SaaS configuration
via API, which should not be confused with the SDK configuration.

```ts
import { Config } from '@cspark/sdk';

const baseUrl = 'https://spark.my-env.coherent.global/my-tenant';
const token = 'my-access-token'; // only this security scheme is supported for this API
const config = new Config({ baseUrl, token });
config.get().then((response) => console.log(response.data));
```

### Returns

This method returns an object containing the platform configuration.
See the [sample configuration](./samples/spark-config.json) for more information.

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
encapsulated logic along with associated JavaScript files. By packaging these
components together, a Spark WASM module becomes executable within both browser and
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

```ts
await spark.wasm.download({ versionId: 'uuid' });
```

### Returns

When successful, this method returns a buffer containing the WebAssembly module.

```ts
import { createWriteStream } from 'fs';
import Spark from '@cspark/sdk';

const spark = new Spark({ env: 'my-env', tenant: 'my-tenant', token: 'bearer token' });

spark.wasm
  .download('version/uuid')
  .then((response) => {
    const file = createWriteStream('path/to/my-wasm-module.zip');
    response.buffer.pipe(file); // write downloaded file to disk
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
await spark.files.download('https://my-spark-file-url');
```

Some of the generated files carry a token for access in the URL. In such cases, you
can use a static method to download the file since it doesn't require any Spark settings.

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

[Back to top](#other-apis) or [Main Documentation](./readme.md)
