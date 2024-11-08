<!-- markdownlint-disable-file MD024 -->

# Hybrid Runner SDK

This reference assumes that you are familiar with Coherent Spark's hybrid
deployments. Otherwise, visit the [User Guide][user-guide] to learn more about it.

Assuming that you have a hybrid deployment setting, you may use the following methods
to perform certain tasks on a runner. Obviously, a runner offers a smaller subset of
functionality compared to the SaaS API, which revolves around the ability to execute
services locally or in restricted environments.

To access the Hybrid Runner API, you need to initialize a client that points to the
base URL of the runner. By default, the base URL is `http://localhost:3000` and can be
read as an environment variable `CSPARK_RUNNER_URL`.

You may choose to use authentication or not, depending on how your runner is configured.

```ts
import Hybrid from '@cspark/wasm';

const hybrid = new Hybrid({ baseUrl: 'http://localhost:8080', tenant: 'my-tenant', token: 'open' });
```

> `token: 'open'` is used to express open authorization. Otherwise, the SDK will throw
> an error if the token is not provided.

| Verb                                      | Description                                               |
| ----------------------------------------- | --------------------------------------------------------- |
| `Hybrid.health.check()`                   | [Health check](#health-check).                            |
| `Hybrid.version.get()`                    | [Check the Neuron compatibility version](#version-check). |
| `Hybrid.services.upload(file, [options])` | [Upload a WASM package](#upload-a-wasm-package).          |
| `Hybrid.services.execute(uri, [params])`  | [Execute a WASM service](#execute-a-wasm-service).        |

## Health check

This method allows you to check the health of a running Hybrid Runner.

```ts
import Hybrid from '@cspark/wasm';

Hybrid.healthCheck().then((response) => console.log(response.data)); // will use default base URL
// or
Hybrid.healthCheck('http://localhost:8080').then((response) => console.log(response.data));
```

Alternatively, you can use the `Hybrid.health.check()` method directly from the client instance.

```ts
import Hybrid from '@cspark/wasm';

const hybrid = new Hybrid({ tenant: 'my-tenant', token: 'open' });

hybrid.health.check().then((response) => console.log(response.data));
```

### Returns

```json
{ "msg": "ok" }
```

## Version check

This method allows you to check the neuron compatibility version of a running Hybrid Runner.

```ts
import Hybrid from '@cspark/wasm';

Hybrid.getVersion().then((response) => console.log(response.data)); // will use default base URL
// or
Hybrid.getVersion('http://localhost:8080').then((response) => console.log(response.data));
```

Alternatively, you can use the `Hybrid.version.get()` method directly from the client instance.

```ts
import Hybrid from '@cspark/wasm';

const hybrid = new Hybrid({ tenant: 'my-tenant', token: 'open' });

hybrid.version.get().then((response) => console.log(response.data));
```

### Returns

```json
{
  "lastPullDate": "2024-05-07T03:43:46.333Z",
  "filehash": "d2f6a43d10f9aacdb8c61f0bb6307e4ebec782ecb4f44f1194a936a9227d99f2",
  "version": "1.31.2"
}
```

## Upload a WASM package

This method allows you to upload a WASM package to a running Hybrid Runner. The zip file
should contain the compiled wasm file and other assets needed to run the service.
This package refers to the zip file exported from the SaaS using `onpremises` mode
via [Export API](https://docs.coherent.global/spark-apis/impex-apis/export).

> [!NOTE]
> If your running instance of the runner relies on the automatic WASM pull, there
> is no need to use this method as the runner will automatically download the
> WASM package from the SaaS.

### Arguments

This method accepts a `Readable` stream of the binary file as the first argument
and optionally the name of the file as the second argument.

```ts
import fs from 'fs';
import Hybrid from '@cspark/wasm';

const hybrid = new Hybrid({ tenant: 'my-tenant', token: 'open' });

const file = fs.createReadStream('path/to/my-service.zip');
hybrid.services.upload(file, 'my-service.zip').then((response) => console.log(response.data));
```

### Returns

When successful, this method returns a JSON payload containing the uploaded
service information such as the tenant, the service details, the input and output
tables, and the version ID.

```json
{
  "response_data": [
    {
      "tenant": "my-tenant",
      "services": [
        {
          "EffectiveStartDate": "1970-12-03T04:56:56.186Z",
          "EffectiveEndDate": "1980-12-03T04:56:56.186Z",
          "EngineInformation": {
            "FileSize": 592696,
            "Author": "john.doe@coherent.global",
            "ProductName": "my-folder",
            "Revision": "0.2.0",
            "Description": null,
            "FileMD5Hash": "hash-info",
            "UniversalFileHash": null,
            "ReleaseDate": "1970-12-03T04:56:56.186Z",
            "ServiceName": "my-service",
            "NoOfInstance": 1,
            "UploaderEmail": "john.doe@coherent.global",
            "DefaultEngineType": "Neuron",
            "OriginalFileName": "my-service.xlsx",
            "SizeOfUploadedFile": 592696,
            "ReleaseNote": null,
            "IsTypeScriptFile": false,
            "EngineUpgradeType": "minor",
            "PublicAPI": false,
            "FileGuid": "uuid",
            "ServiceGuid": "uuid",
            "ServiceVersionGuid": "uuid",
            "BaseUrl": "https://excel.my-env.coherent.global",
            "Tenant": "my-tenant",
            "AllowToStoreHistory": true,
            "CalcMode": "AUTO",
            "ForceInputsWriteBeforeCalcModeChanges": true,
            "Provenance": null,
            "VersionLabel": null,
            "ExplainerType": "",
            "IsXParameter": false,
            "ParametersetCompatibilityGroup": "",
            "XParameterSetVersionId": "",
            "VersionUpgradeAssert": "OFF",
            "XReportRanges": null,
            "Tags": null,
            "OriginalServiceHash": "hash-info",
            "CompiledOutputHash": "hash-info",
            "CompilerVersion": "Neuron_v1.12.0",
            "CompilerVersionServiceUpdate": "StableLatest",
            "DirectAddressingOutputsEnabled": false
          },
          "XInputTable": [
            {
              "Input Name": "my_input_1",
              "Description": null,
              "Address": "F6"
            },
            {
              "Input Name": "my_input_2",
              "Description": null,
              "Address": "F7"
            },
            {
              "Input Name": "my_input_3",
              "Description": null,
              "Address": "F5"
            }
          ],
          "XOutputTable": [
            {
              "Output Name": "my_output_1",
              "Description": null,
              "Address": "C8"
            },
            {
              "Output Name": "my_output_2",
              "Description": null,
              "Address": "B14:B115"
            }
          ],
          "VersionId": "uuid",
          "HasSignatureChain": null
        }
      ]
    }
  ]
}
```

The service information can be used to identify the service to be executed. For example,
the `version_id` or a combination of `folder` (i.e., `ProductName`), `service` (i.e.,
`ServiceName`), and `version` (i.e., `Revision`) can be used to execute a service
using the `Hybrid.services.execute(...)` method described below.

## Execute a WASM service

This method allows you to execute a WASM service using a Hybrid runner instance.

Similarly to the Spark API, the Hybrid Runner API supports two versions of Execute API: `v3`
(or [v3 format][v3-format]) and `v4` ([v4 format][v4-format]), which are used respectively
for single inputs and multiple inputs data formats.
By default, the SDK will return the output data in the [v4 format][v4-format]
unless you prefer to work with the original format emitted by the API.

Check out the [API reference](https://docs.coherent.global/spark-apis/execute-api)
to learn more about Services API.

### Arguments

The method accepts a `string` or a `UriParams` object as the service URI, and a second
optional argument for input data and metadata. The arguments are similar to
those of the regular [`Spark.services.execute(uri, [params])`][sdk-service-execute]
method used for the SaaS-based API in [@cspark/sdk][sdk].

Keep in mind that the Hybrid Runner API does not support all the features of the SaaS API.
Its primary objective is to execute a Neuron-based service locally or in a restricted environment.
As a result, most of the metadata will be ignored by the runner.

For the first argument, the `UriParams` object supports to the following properties:

| Property    | Type     | Description                                      |
| ----------- | -------- | ------------------------------------------------ |
| _folder_    | `string` | The folder name.                                 |
| _service_   | `string` | The service name.                                |
| _version_   | `string` | The revision number of the service.              |
| _versionId_ | `string` | The UUID of a particular version of the service. |
| _serviceId_ | `string` | The service UUID (points to the latest version). |

For the second argument, the `ExecuteParams` object supports the following properties:

| Property          | Type                                             | Description                                             |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------- |
| _inputs_          | `null \| string \| Record<string, any> \| any[]` | The input data (single or many).                        |
| _responseFormat_  | `original \| alike`                              | Response data format to use (defaults to `alike`).      |
| _encoding_        | `gzip \| deflate`                                | Compress the payload using this encoding.               |
| _activeSince_     | `string \| number \| Date`                       | The transaction date (helps pinpoint a version).        |
| _sourceSystem_    | `string`                                         | The source system (defaults to `Spark JS SDK`).         |
| _correlationId_   | `string`                                         | The correlation ID.                                     |
| _callPurpose_     | `string`                                         | The call purpose.                                       |
| _debugSolve_      | `boolean`                                        | Enable debugging for solve functions.                   |
| _outputsFilter_   | `string`                                         | Use to perform advanced filtering of outputs.           |
| _echoInputs_      | `boolean`                                        | Whether to echo the input data (alongside the outputs). |
| _tablesAsArray_   | `string \| string[]`                             | Filter which table to output as JSON array.             |
| _selectedOutputs_ | `string \| string[]`                             | Select which output to return.                          |
| _subservices_     | `string \| string[]`                             | The list of sub-services to output.                     |

```ts
import Hybrid from '@cspark/wasm';

const hybrid = new Hybrid({ tenant: 'my-tenant', token: 'open' });
hybrid.services.execute('my-folder/my-service', { my_input: 42 }).then((response) => console.log(response.data));
```

### Returns

This method returns the output data of the WASM service execution in the same format
as the regular [`Spark.services.execute(uri, [params])`][sdk-service-execute]
method used for SaaS-based APIs in [@cspark/sdk][sdk].

[Back to top](#hybrid-runner-sdk)

<!-- References -->

[sdk]: https://www.npmjs.com/package/@cspark/sdk
[user-guide]: https://docs.coherent.global/integrations/how-to-deploy-a-hybrid-runner
[sdk-service-execute]: https://github.com/Coherent-Partners/spark-ts-sdk/blob/main/docs/services.md#execute-a-spark-service
[v3-format]: https://docs.coherent.global/spark-apis/execute-api/execute-api-v3
[v4-format]: https://docs.coherent.global/spark-apis/execute-api/execute-api-v4
