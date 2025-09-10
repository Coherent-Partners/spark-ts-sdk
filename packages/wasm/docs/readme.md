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

| Verb                                         | Description                                                      |
| -------------------------------------------- | ---------------------------------------------------------------- |
| `Hybrid.health.check()`                      | [Health check](#health-check).                                   |
| `Hybrid.version.get()`                       | [Check the Neuron compatibility version](#version-check).        |
| `Hybrid.status.get()`                        | [Get the status of the runner](#get-the-status-of-the-runner).   |
| `Hybrid.services.upload(file, [options])`    | [Upload a WASM package](#upload-a-wasm-package).                 |
| `Hybrid.services.execute(uri, [params])`     | [Execute a WASM service](#execute-a-wasm-service).               |
| `Hybrid.services.validate(uri, [params])`    | [Validate input data](#validate-input-data).                     |
| `Hybrid.services.getMetadata(uri, [params])` | [Get the metadata of a service](#get-the-metadata-of-a-service). |

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

## Get the status of the runner

This method allows you to get the status of a running Hybrid Runner (v1.46.0+).

```ts
import Hybrid from '@cspark/wasm';

Hybrid.getStatus().then((response) => console.log(response.data)); // will use default base URL
// or
Hybrid.getStatus('http://localhost:8080').then((response) => console.log(response.data));
```

Alternatively, you can use the `Hybrid.status.get()` method directly from the client instance.

```ts
import Hybrid from '@cspark/wasm';

const hybrid = new Hybrid({ tenant: 'my-tenant', token: 'open' });
hybrid.status.get().then((response) => console.log(response.data));
```

### Returns

```json
{
  "models": [
    {
      "tenant": "my-tenant",
      "model_stats": [
        {
          "thread_stats": {
            "1": {
              "init_time_ms": 0,
              "init_memory_mb": null,
              "uptime_ms": 1171059,
              "peak_memory_mb": null,
              "last_execute_consume_memory_mb": null,
              "current_memory_mb": 122.63
            }
          },
          "memory_usage_mb": 122.63,
          "uptime_ms": 1171059,
          "min_time_ms": 50,
          "mean_time_ms": 50,
          "p95_time_ms": 50,
          "p99_time_ms": 50,
          "max_time_ms": 50,
          "busy": 0,
          "size": 1,
          "id": "uuid",
          "last_use": "1970-12-03T04:56:56.186Z",
          "completed_count": 0,
          "running_count": 0,
          "crash_count": 0,
          "timeout_count": 0
        }
      ],
      "total_model": 1,
      "total_instances": 1
    }
  ],
  "memory_usage_mb": 122.75,
  "memory_limit_mb": 14073748835532.8
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

## Validate input data

This method validates the input data using static or dynamic validations set in
the Excel file via the WASM service.

- `static` validation is a cell validation that's only affected by its own formula.
- `dynamic` validation is a cell validation that depends on other cells/inputs.

See more examples of [static validation](https://docs.coherent.global/spark-apis/validation-api#validation_type-static)
and [dynamic validation](https://docs.coherent.global/spark-apis/validation-api#validation_type-dynamic-part-1).

### Arguments

This method relies on the service identifier in `UriParams` format (`versionId` or `serviceId`)
to locate a model version to validate its input data. To specify which type of validation to use,
you must provide the `validationType` property as part of the second argument. Other extra
metadata can be provided as well.

| Property         | Type                    | Description                    |
| ---------------- | ----------------------- | ------------------------------ |
| _inputs_         | `Record<string, any>`   | The input data.                |
| _metadata_       | `Record<string, any>`   | Extra metadata fields.         |
| _validationType_ | `'dynamic' \| 'static'` | The type of validation to use. |

```ts
import Hybrid from '@cspark/wasm';

const hybrid = new Hybrid({ tenant: 'my-tenant', token: 'open' });
hybrid.services
  .validate('version/uuid', { inputs: { my_input: 13 }, validationType: 'dynamic' })
  .then((response) => console.log(response.data));
```

### Returns

This method returns the validation result in the same format as the regular
`Spark.services.validate(uri, [**params])` method used for the SaaS-based API in
[@cspark/sdk][sdk].

## Get the metadata of a service

A service metadata is a series of key-value pairs that are used for other purposes
than computed output data. For example, you may want to embed details such as fonts
and colors in the Excel file of a service. This method helps you retrieve these
metadata fields as part of the output data.

Check out the [API reference](https://docs.coherent.global/spark-apis/metadata-api)
to learn more about Metadata API.

### Arguments

This method accepts the `versionId` or `serviceId` in `string` or `UriParams` format
to locate a model version to retrieve the metadata. Other extra metadata can be
provided as well as a second argument.

| Property   | Type                  | Description            |
| ---------- | --------------------- | ---------------------- |
| _inputs_   | `Record<string, any>` | The input data.        |
| _metadata_ | `Record<string, any>` | Extra metadata fields. |

```ts
import Hybrid from '@cspark/wasm';

const hybrid = new Hybrid({ tenant: 'my-tenant', token: 'open' });
hybrid.services.getMetadata('version/uuid').then((response) => console.log(response.data));
```

### Returns

Do know that metadata fields created with [Subservices][subservices] are retrieved
faster and more efficiently as they are not computed as regular outputs from Execute API.

```json
{
  "status": "Success",
  "error": null,
  "response_data": {
    "outputs": {
      "Metadata.PrimaryColor": "#FF0",
      "Metadata.Font": "Arial",
      "Metadata.Logo": "data:image/png;base64,..."
    },
    "warnings": null,
    "errors": null,
    "service_chain": null
  },
  "response_meta": {
    "service_id": "uuid",
    "version_id": "uuid",
    "version": "1.2.3",
    "process_time": 0,
    "call_id": "uuid",
    "compiler_type": "Type3",
    "compiler_version": "1.2.0",
    "source_hash": null,
    "engine_id": "hash-info",
    "correlation_id": null,
    "system": "SPARK",
    "request_timestamp": "1970-01-23T00:58:20.752Z"
  }
}
```

[Back to top](#hybrid-runner-sdk)

<!-- References -->

[sdk]: https://www.npmjs.com/package/@cspark/sdk
[subservices]: https://docs.coherent.global/build-spark-services/subservices#metadata-subservice
[user-guide]: https://docs.coherent.global/integrations/how-to-deploy-a-hybrid-runner
[sdk-service-execute]: https://github.com/Coherent-Partners/spark-ts-sdk/blob/main/docs/services.md#execute-a-spark-service
[v3-format]: https://docs.coherent.global/spark-apis/execute-api/execute-api-v3
[v4-format]: https://docs.coherent.global/spark-apis/execute-api/execute-api-v4
