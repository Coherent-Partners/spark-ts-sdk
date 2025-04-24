<!-- markdownlint-disable-file MD024 -->

# Services API

| Verb                                    | Description                                                                            |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `Spark.services.create(data)`           | [Create a new Spark service](#create-a-new-spark-service).                             |
| `Spark.services.execute(uri, inputs)`   | [Execute a Spark service](#execute-a-spark-service).                                   |
| `Spark.services.transform(uri, inputs)` | [Execute a Spark service using Transforms](#execute-a-spark-service-using-transforms). |
| `Spark.services.getVersions(uri)`       | [Get all the versions of a service](#get-all-the-versions-of-a-service).               |
| `Spark.services.getSwagger(uri)`        | [Get the Swagger documentation of a service](#get-the-swagger-documentation).          |
| `Spark.services.getSchema(uri)`         | [Get the schema for a given service](#get-the-schema-for-a-service).                   |
| `Spark.services.getMetadata(uri)`       | [Get the metadata of a service](#get-the-metadata-of-a-service).                       |
| `Spark.services.download(uri)`          | [Download the excel file of a service](#download-the-excel-file-of-a-service).         |
| `Spark.services.recompile(uri)`         | [Recompile a service using specific compiler version](#recompile-a-service).           |
| `Spark.services.validate(uri, data)`    | [Validate input data using static or dynamic validations](#validate-input-data).       |
| `Spark.services.export(uri)`            | [Export Spark services as a zip file](#export-spark-services).                         |
| `Spark.services.import(data)`           | [Import a Spark service from a zip file](#import-spark-services).                      |
| `Spark.services.delete(uri)`            | [Delete a Spark service](#delete-a-spark-service).                                     |

A Spark service is the representation of your Excel file in the Spark platform.

## Create a new Spark service

This method helps you create a new service in Spark by uploading the Excel file,
compiling it into a [WASM module](./misc.md), and then publishing a new version
of it as a service.

If you're uncertain of how to prepare an Excel file for Spark, take a look at the
[User Guide](https://docs.coherent.global/getting-started-in-5-minutes) for more
information.

> [!IMPORTANT]
> You must create a folder before you can create a service. Please refer to the
> [Folders API](./folders.md) to learn more about creating a folder.

### Arguments

This method accepts an extended version of `UriParams` object as an argument.

| Property        | Type                       | Description                                                         |
| --------------- | -------------------------- | ------------------------------------------------------------------- |
| _folder_        | `string`                   | The folder name.                                                    |
| _service_       | `string`                   | The service name.                                                   |
| _file_          | `Readable`                 | The file as a readable stream.                                      |
| _fileName_      | `string`                   | The name of the Excel file (defaults to `UriParams.service`).       |
| _versioning_    | `major \| minor \| patch`  | How to increment the service version (defaults to `minor`).         |
| _startDate_     | `number \| string \| Date` | The effective start date (defaults to `Date.now()` ).               |
| _endDate_       | `number \| string \| Date` | The effective end date (defaults to 10 years later).                |
| _draftName_     | `string`                   | This overrides the `service` name to a custom name.                 |
| _trackUser_     | `boolean`                  | Track the user who created the service (defaults to `false`).       |
| _maxRetries_    | `number`                   | The number of retries to attempt (defaults to `Config.maxRetries`). |
| _retryInterval_ | `number`                   | The interval between retries in seconds (defaults to `1` second).   |

```ts
import { createReadStream } from 'fs';

await spark.services.create({
  folder: 'my-folder',
  service: 'my-service',
  file: createReadStream('path/to/my-service.xlsx'),
  fileName: 'my-service.xlsx',
  versioning: 'patch',
  trackUser: true,
  maxRetries: 10,
  retryInterval: 3,
});
```

Depending on the size of the Excel file and the complexity of the service, this
method may take a while to run. Do allocate enough time for the method to complete.
That is, `maxRetries` and `retryInterval` are provided to help you extend the
timeout period.

Here's a hierarchy of the service creation process:

- `Spark.services.create` (1)
  - `Spark.services.compile` (2)
    - `Spark.services.compilation.initiate` (3)
    - `Spark.services.compilation.getStatus` (4)
  - `Spark.services.publish` (5)

If you want to have more control, you can invoke the methods in the hierarchy
individually. For example, if you only want to compile the service, you can call
`Spark.services.compile()` directly, which will only execute steps (3) and (4).

### Returns

This method returns a JSON (not the `HttpResponse` object) with detailed information
on the upload, compilation, and publication processes as shown below.

```json
{
  "upload": {
    "status": "Success",
    "response_data": {
      "lines_of_code": 13,
      "hours_saved": 0.01,
      "nodegen_compilation_jobid": "uuid",
      "original_file_documentid": "uuid",
      "engine_file_documentid": "uuid",
      "warnings": [],
      "current_statistics": null,
      "no_of_sheets": 1,
      "no_of_inputs": 4,
      "no_of_outputs": 2,
      "no_of_formulas": 2,
      "no_of_cellswithdata": 42
    },
    "response_meta": {
      "service_id": "uuid",
      "version_id": "uuid",
      "version": "0.1.0",
      "process_time": 68,
      "call_id": null,
      "compiler_type": "Neuron",
      "compiler_version": null,
      "source_hash": null,
      "engine_id": null,
      "correlation_id": null,
      "parameterset_version_id": null,
      "system": "SPARK",
      "request_timestamp": "1970-01-23T04:56:07.890Z"
    },
    "error": null
  },
  "compilation": {
    "status": "Success",
    "response_data": {
      "status": "Success",
      "last_error_message": "null",
      "progress": 100
    },
    "response_meta": {
      "system": "SPARK",
      "request_timestamp": "1970-01-23T04:56:07.890Z"
    },
    "error": null
  },
  "publication": {
    "status": "Success",
    "response_data": {
      "version_id": "uuid"
    },
    "response_meta": {
      "system": "SPARK",
      "request_timestamp": "1970-01-23T04:56:07.890Z"
    },
    "error": null
  }
}
```

## Execute a Spark service

This method allows you to execute a Spark service.

Currently, Coherent Spark supports two versions of Execute API: `v3` (or [v3 format][v3-format])
and `v4` ([v4 format][v4-format]), which are used respectively for single-input and
multiple-input data formats.
By default, the SDK will return the output data in the [v4 format][v4-format]
unless you prefer to work with the original format, i.e., the one emitted by the API.

Check out the [API reference](https://docs.coherent.global/spark-apis/execute-api)
to learn more about Services API.

### Arguments

The method accepts a string or a `UriParams` object and optionally a second object
with the input data and metadata as arguments. See the use cases below.

- **Default inputs**:
  the following example demonstrates how to execute a service with default values.
  As you may probably guess, the SDK ignores those default values. Behind the scenes, the SDK
  uses an empty object `{}` as the input data, which is an indicator for Spark to
  use the default inputs defined in the Excel file.

```ts
await spark.services.execute('my-folder/my-service');
// or
await spark.services.execute({ folder: 'my-folder', service: 'my-service' });
```

- **Inputs only**:
  the previous example is the simplest form of executing a service. In most cases, you
  will want to provide input data. You can do so by passing an `inputs` object as
  the second argument.

```ts
await spark.services.execute('my-folder/my-service', { inputs: { my_input: 13 } });
```

- **Inputs with metadata**: metadata can be provided along with the input data.
  Keep in mind that some metadata fields only apply to the v3 format and will
  have no effect on the service execution.

```ts
const inputs = { my_input: 13 };
const metadata = { subservices: 'sum,product', callPurpose: 'Demo' };
await spark.services.execute('my-folder/my-service', { inputs, ...metadata });
```

- **JSON string data**:
  you may use string data as long as it's a valid JSON string and follows either
  the v3 or v4 format.

```ts
await spark.services.execute('my-folder/my-service', { inputs: `{ "my_input": 13 }` });
```

The previous examples will execute the latest version of a service. If you want
to execute a specific version, you can do the following:

- using **versionId** (the fastest):
  `versionId` is the UUID of a particular version of the service.

```ts
await spark.services.execute('version/uuid');
// or
await spark.services.execute({ versionId: 'uuid' });
```

- using **serviceId**:
  `serviceId` is the UUID of the service and points to the latest version of the service.

```ts
await spark.services.execute('service/uuid');
// or
await spark.services.execute({ serviceId: 'uuid' });
```

- using semantic **version**:
  `version` also known as revision number is the semantic version of the service.
  However, using only `version` is not enough to locate a service. You must provide
  either the `folder` and `service` names or the `serviceId`.

```ts
await spark.services.execute('my-folder/my-service[0.1.0]');
// or
await spark.services.execute({ serviceId: 'uuid', version: '0.1.0' });
```

- using **proxy** endpoints:
  `proxy` is the custom endpoint associated with the service. Remember that custom
  endpoints are only available for the [v3 format][v3-format].

```ts
await spark.services.execute('proxy/custom-endpoint');
// or
await spark.services.execute({ proxy: 'custom-endpoint' });
```

As you can tell, there are multiple flavors when it comes to locating and executing
a Spark service. You can choose the one that suits best your needs. Here's a summary
of the parameters you can use for this method:

For the first argument, when `UriParams` object:

| Property    | Type      | Description                                      |
| ----------- | --------- | ------------------------------------------------ |
| _folder_    | `string`  | The folder name.                                 |
| _service_   | `string`  | The service name.                                |
| _version_   | `string`  | The user-friendly semantic version of a service. |
| _versionId_ | `string`  | The UUID of a particular version of the service. |
| _serviceId_ | `string`  | The service UUID (points to the latest version). |
| _proxy_     | `string`  | The custom endpoint associated with the service. |
| _public_    | `boolean` | Whether to use the public endpoint.              |

For the second argument, `ExecuteParams` object:

| Property          | Type                                             | Description                                                  |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| _inputs_          | `null \| string \| Record<string, any> \| any[]` | The input data (single or many).                             |
| _responseFormat_  | `original \| alike`                              | Response data format to use (defaults to `alike`).           |
| _encoding_        | `gzip \| deflate`                                | Compress the payload using this encoding.                    |
| _activeSince_     | `string \| number \| Date`                       | The transaction date (helps pinpoint a version).             |
| _sourceSystem_    | `string`                                         | The source system (defaults to `Spark JS SDK`).              |
| _correlationId_   | `string`                                         | The correlation ID.                                          |
| _callPurpose_     | `string`                                         | The call purpose.                                            |
| _compilerType_    | `string`                                         | The compiler type (defaults to `Neuron`).                    |
| _debugSolve_      | `boolean`                                        | Enable debugging for solve functions.                        |
| _outputsFilter_   | `string`                                         | Use to perform advanced filtering of outputs.                |
| _echoInputs_      | `boolean`                                        | Whether to echo the input data (alongside the outputs).      |
| _downloadable_    | `boolean`                                        | Produce a downloadable rehydrated Excel file for the inputs. |
| _tablesAsArray_   | `string \| string[]`                             | Filter which table to output as JSON array.                  |
| _selectedOutputs_ | `string \| string[]`                             | Select which output to return.                               |
| _subservices_     | `string \| string[]`                             | The list of sub-services to output.                          |

### Returns

This method returns the output data of the service execution in the following format:

- `original`: the output data as JSON in its original format (i.e., as returned by the API).
- `alike`: the output data as JSON in the v4 format whether it's single or multiple inputs.

For instance, the output data of a service execution for single inputs looks like this
when the `responseFormat` is set to `alike`:

```json
{
  "outputs": [{ "my_output": 42 }],
  "process_time": [1],
  "warnings": [null],
  "errors": [null],
  "service_chain": [null],
  "service_id": "uuid",
  "version_id": "uuid",
  "version": "1.2.3",
  "call_id": "uuid",
  "compiler_version": "1.2.0",
  "correlation_id": null,
  "request_timestamp": "1970-01-23T00:58:20.752Z"
}
```

You may wonder why the output data is wrapped up in an array for single inputs.
This is because the `alike` format is designed to work with both single and multiple
inputs. This should help maintain consistency in the output data format. But if you
prefer the original format emitted by the API, you can set the `responseFormat`
to `original`.

```json
{
  "status": "Success",
  "error": null,
  "response_data": {
    "outputs": { "my_output": 42 },
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
    "compiler_type": "Neuron",
    "compiler_version": "1.2.0",
    "source_hash": null,
    "engine_id": "hash-info",
    "correlation_id": null,
    "system": "SPARK",
    "request_timestamp": "1970-01-23T00:58:20.752Z"
  }
}
```

> [!IMPORTANT]
> Executing multiple inputs is a synchronous operation in Spark and may take some time to complete.
> The default timeout for this client is 60 seconds, and for Spark servers, it is 55 seconds.
> Another good practice is to split the batch (of multiple inputs) into smaller chunks and
> submit separate requests.

## Execute a Spark service using Transforms

This method allows you to execute a Spark service using unstructured data. It is
quite useful especially when the service in question does not conform to the client
application's data structure. This is the perfect opportunity to use a middle layer
such as **Transforms** on the Spark side to adapt the service execution to the client
application.

Check out the [API reference](https://docs.coherent.global/spark-apis/transforms-api)
to learn more about Transforms API, including how to create, update, and delete
[Transform documents](samples/jsonmapper_transform.json).

### Arguments

The method accepts a string or a `UriParams` object as the first argument and a
second object with the input data and metadata as arguments. Additional properties
concerning the _transforms_ can be provided as part of the second argument:

| Property     | Type                                         | Description                                            |
| ------------ | -------------------------------------------- | ------------------------------------------------------ |
| _inputs_     | `any`                                        | The (unstructured) input data.                         |
| _using_      | `string \| { name: string, folder: string }` | The transform URI locator.                             |
| _apiVersion_ | `v3 \| v4`                                   | The target API version (defaults to `v3`).             |
| _encoding_   | `gzip \| deflate`                            | Apply this content encoding between client and server. |

> Note that, when using `encoding`, the SDK will automatically compress and decompress the
> payload using the specified encoding.

As for the metadata of a Spark service execution, this method follows the same
pattern as the [Spark.services.execute()](#execute-a-spark-service) method. You
can provide them as keyword arguments.

```ts
await spark.services.transform('my-folder/my-service', {
  inputs: { value: 42 },
  using: 'my-transform',
  encoding: 'gzip',
  callPurpose: 'Demo',
});
```

> [!TIP]
> The `using` property can be a string or an object with `name` and `folder` properties.
> When **string**, it will be interpreted as the name of the transform, which follows the
> legacy naming convention for transform documents saved under the `apps/transforms` folder.
> Do know that the JSON **object** way is the new, preferred method of creating and saving
> Transform documents.
>
> With the SDK, you can perform CRUD operations on Transform documents using the
> `spark.transforms.*` methods.

```ts
await spark.transforms.validate('stringified transform content goes here');
// or
await spark.transforms.validate({
  schema: 'JSONtransforms_v1.0.1',
  apiVersion: 'v3',
  inputs: 'your-jsonata-expression goes here',
});
// NOTE: The validation is performed via the Spark server and not the SDK.
```

### Returns

When successful, this method returns the output data of the service execution in
accordance with the rules defined in the [Transform document](https://docs.coherent.global/spark-apis/transforms-api#example)
if any.

## Get all the versions of a service

This method returns all the versions of a service.

### Arguments

The method relies on the `folder` and `service` names to retrieve the versions
of a particular service. Hence, this method accepts the following arguments to
locate the service:

```ts
await spark.services.getVersions('my-folder/my-service');
// or
await spark.services.getVersions({ folder: 'my-folder', service: 'my-service' });
```

### Returns

```json
[
  {
    "id": "uuid",
    "createdAt": "1970-12-03T04:56:58.186Z",
    "engine": "my-service",
    "revision": "0.2.0",
    "effectiveStartDate": "1970-12-03T04:56:58.186Z",
    "effectiveEndDate": "1990-12-03T04:56:58.186Z",
    "isActive": true,
    "releaseNote": "some release note",
    "childEngines": null,
    "versionLabel": "",
    "defaultEngineType": "Neuron",
    "tags": null,
    "product": "my-folder",
    "author": "john.doe@coherent.global",
    "originalFileName": "my-service-v2.xlsx"
  },
  {
    "id": "86451865-dc5e-4c7c-a7f6-c35435f57dd1",
    "createdAt": "1970-12-03T04:56:58.186Z",
    "engine": "my-service",
    "revision": "0.1.0",
    "effectiveStartDate": "1970-12-03T04:56:58.186Z",
    "effectiveEndDate": "1980-12-03T04:56:58.186Z",
    "isActive": false,
    "releaseNote": null,
    "childEngines": null,
    "versionLabel": "",
    "defaultEngineType": "XConnector",
    "tags": null,
    "product": "my-folder",
    "author": "jane.doe@coherent.global",
    "originalFileName": "my-service.xlsx"
  }
]
```

> Note that the API returns a different format for the versions of a service.
> The SDK flattens the response and returns a single array of objects to make it
> easier to work with.

## Get the Swagger documentation

This method returns the JSON content or downloads the swagger file of a service.

### Arguments

The method accepts a string or a `UriParams` object as an argument.

```ts
await spark.services.getSwagger('my-folder/my-service');
// or
await spark.services.getSwagger({ folder: 'my-folder', service: 'my-service' });
```

When using the `UriParams` object, you can also specify additional options:

| Property       | Type      | Description                                                               |
| -------------- | --------- | ------------------------------------------------------------------------- |
| _folder_       | `string`  | The folder name.                                                          |
| _service_      | `string`  | The service name.                                                         |
| _versionId_    | `string`  | The UUID to target a specific version of the service (optional).          |
| _downloadable_ | `boolean` | If `true`, the method downloads the swagger file; else, the JSON content. |
| _subservice_   | `string`  | The list of the subservices being requested or `all` subservices.         |

```ts
await spark.services.getSwagger({
  folder: 'my-folder',
  service: 'my-service',
  downloadable: true,
});
```

### Returns

See a [sample swagger JSON](./samples/service-swagger.json) for more information
about the swagger content.

## Get the schema for a service

This method returns the schema of a service. A service schema is a JSON object
that describes the structure of the input and output data of a service. It includes
but not limited to the following information:

- Book summary
- Book properties
- Engine ID and inputs
- Service outputs
- Metadata

### Arguments

The method accepts a string or a `UriParams` object as an argument.

```ts
await spark.services.getSchema('my-folder/my-service'); // combining folder and service names
// or
await spark.services.getSchema({ versionId: 'uuid' }); // by version ID
```

### Returns

See a [sample service schema](./samples/service-swagger.json) for more information.

## Get the metadata of a service

A service metadata is a series of key-value pairs that are used for other purposes
than computed output data. For example, you may want to embed details such as fonts
and colors in the Excel file of a service. This method helps you retrieve these
metadata fields as part of the output data.

Check out the [API reference](https://docs.coherent.global/spark-apis/metadata-api)
to learn more about Metadata API.

### Arguments

The method accepts a string or a `UriParams` object as an argument.

```ts
await spark.services.getMetadata('my-folder/my-service');
// or
await spark.services.getMetadata({ folder: 'my-folder', service: 'my-service' });
```

### Returns

Do know that metadata fields created with
[Subservices](https://docs.coherent.global/build-spark-services/subservices#metadata-subservice)
are retrieved faster and more efficiently as they are not computed as regular
outputs from Execute API.

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

## Download the Excel file of a service

During the conversion process, Spark builds a service from the Excel file and keeps
a _configured version_ of the service for version control. This configured version
is nothing but the Excel file that was uploaded to Spark with some additional
metadata, i.e., service properties stored as custom XML. Benefits of downloading
the configured version include the ability to link it with the
[Coherent Assistant Add-in](https://docs.coherent.global/assistant) and operate
that service using Microsoft Excel.

This method lets you download either the configured version or the original Excel
file of a service.

### Arguments

The method accepts a string or a `UriParams` object as an argument.

```ts
await spark.services.download('my-folder/my-service');
// or
await spark.services.download({ folder: 'my-folder', service: 'my-service', versionId: 'uuid' });
```

> Note that the version piece is optional. If not provided, the latest version
> will be downloaded.

You may use additional options to indicate whether you intend to download the
original Excel file or the configured version of it.

| Property   | Type                     | Description                                               |
| ---------- | ------------------------ | --------------------------------------------------------- |
| _fileName_ | `string`                 | Save the downloaded file with a different name.           |
| _type_     | `original \| configured` | The type of the file to download (defaults to `original`) |

```ts
await spark.services.download({
  folder: 'my-folder',
  service: 'my-service',
  versionId: 'version-uuid',
  type: 'configured',
});
```

### Returns

When successful, the method returns an `HttpResponse` object with the buffer
containing the Excel file. Remember to implement mechanisms to save the file
to your local machine.

## Recompile a service

Every service in Spark is compiled using a specific compiler version -- usually
the latest one. However, you may want to recompile a service using a specific
compiler version for various reasons. Keep in mind that a service recompilation
is considered an update to the underlying Spark service but not to the Excel file
itself.

### Arguments

The method accepts a string or a `UriParams` object as an argument.

```ts
await spark.services.recompile('my-folder/my-service');
// or
await spark.services.recompile({ folder: 'my-folder', service: 'my-service' });
```

When using `string`-based service URIs, the method recompiles the service using the
latest compiler version and a `patch` update. If you want to recompile the service
using a specific compiler version, you must use the `UriParams` object.

| Property       | Type                       | Description                                                |
| -------------- | -------------------------- | ---------------------------------------------------------- |
| _versionId_    | `string`                   | The UUID of a particular version of the service.           |
| _compiler_     | `string`                   | The compiler version to use (do not confuse with type).    |
| _upgrade_      | `major \| minor \| patch`  | which type of versioning to apply (defaults to `patch`).   |
| _label_        | `string`                   | The version label.                                         |
| _releaseNotes_ | `string`                   | The release notes.                                         |
| _tags_         | `string \| string[]`       | The comma-separted tags to apply to the service if string. |
| _startDate_    | `number \| string \| Date` | The effective start date.                                  |
| _endDate_      | `number \| string \| Date` | The effective end date.                                    |

The supported compiler versions include but not limited to:

- `Neuron_vM.m.p` (e.g., `Neuron_v1.13.0`)
- `StableLatest`
- `TenantDefault`
- `ReleaseCandidate`

```ts
await spark.services.recompile({
  folder: 'my-folder',
  service: 'my-service',
  versionId: '123e4567-e89b-12d3-a456-426614174000',
  compiler: 'Neuron_v1.13.0',
  upgrade: 'minor',
  label: 'recompilation',
  releaseNotes: 'some release notes',
  tags: 'tag1,tag2',
});
```

## Returns

Recompiling a service will start a background compilation job. If the operation
is successful, this method returns a JSON with the job details.

```json
{
  "status": "Success",
  "error": null,
  "response_data": {
    "versionId": "uuid",
    "revision": "1.2.3",
    "jobId": "uuid"
  },
  "response_meta": {
    "system": "SPARK",
    "request_timestamp": "1970-01-23T21:12:27.698Z"
  }
}
```

A recompilation job is asynchronous and may take some time to complete. You may
want to poll the job status before using the updated service.

## Validate input data

This method validates the input data using static or dynamic validations set in
the Excel file. This is useful for building frontend applications that connect
to Spark services.

- `static` validation is a cell validation that's only affected by its own formula.
- `dynamic` validation is a cell validation that depends on other cells/inputs.

Check out the [API reference](https://docs.coherent.global/spark-apis/validation-api)
to learn more about validation of the inputs and outputs.

> Note that this method works similarly to the `Spark.services.execute` method but
> with a different purpose. If you want to know more about the input and output
> data format, check the [execute(...)](#execute-a-spark-service) method.

### Arguments

This method follows the same pattern as the `execute` method. To specify which type
of validation to use, you must provide the `validationType` property as part of
the `ExecuteParams` object.

```ts
const inputs = { my_input: 13 };
const metadata = { validationType: 'dynamic', callPurpose: 'Demo' };
await spark.services.validate('my-folder/my-service', { inputs, ...metadata });
```

No need to specify the `responseFormat` property as the method always returns the
original format emitted by the API.

### Returns

```json
{
  "status": "Success",
  "error": null,
  "response_data": {
    "outputs": {
      "my_static_input": {
        "validation_allow": "List",
        "validation_type": "static",
        "dependent_inputs": ["my_dynamic_input"],
        "min": null,
        "max": null,
        "options": ["a", "b"],
        "ignore_blank": true
      },
      "my_dynamic_input": {
        "validation_allow": "List",
        "validation_type": "dynamic",
        "dependent_inputs": null,
        "min": null,
        "max": null,
        "options": ["x", "y", "z"],
        "ignore_blank": false
      }
    },
    "warnings": null,
    "errors": null,
    "service_chain": null
  },
  "response_meta": {
    "service_id": "uuid",
    "version_id": "uudi",
    "version": "0.4.2",
    "process_time": 0,
    "call_id": "uuid",
    "compiler_type": "Type3",
    "compiler_version": "1.12.0",
    "source_hash": null,
    "engine_id": "alpha-numeric-id",
    "correlation_id": null,
    "parameterset_version_id": null,
    "system": "SPARK",
    "request_timestamp": "1970-01-23T00:58:20.752Z"
  }
}
```

See more examples of [static validation](https://docs.coherent.global/spark-apis/validation-api#validation_type-static)
and [dynamic validation](https://docs.coherent.global/spark-apis/validation-api#validation_type-dynamic-part-1).

## Export Spark services

This method exports Spark services as a zip file. This method is a wrapper around
the [Spark.impex.export()](./impex.md#export-spark-entities) with the exception
that it only exports services.

### Arguments

You may pass in the service URI as a string or a `UriParams` object.

```ts
await spark.services.export('my-folder/my-service');
// or
await spark.services.export({ folder: 'my-folder', service: 'my-service' });
```

Additionally, you can specify optional parameters to customize the export process.

| Property          | Type                    | Description                                                        |
| ----------------- | ----------------------- | ------------------------------------------------------------------ |
| _folder_          | `string`                | The folder name.                                                   |
| _service_         | `string`                | The service name.                                                  |
| _version_         | `string`                | The semantic version of the service to export.                     |
| _versionId_       | `string`                | The UUID of a particular version of the service.                   |
| _serviceUri_      | `string`                | The service URI (e.g., `my-folder/my-service`).                    |
| _filters_         | `object`                | How to filter out which entities to export.                        |
| _filters.file_    | `migrate \| onpremises` | For data migration or on-prem deployments (defaults to `migrate`). |
| _filters.version_ | `latest \| all`         | Which version of the file to export (defaults to `latest`).        |
| _sourceSystem_    | `string`                | The source system name to export from (e.g., `Spark JS SDK`).      |
| _correlationId_   | `string`                | The correlation ID for the export (useful for tagging).            |
| _maxRetries_      | `number`                | The maximum number of retries when checking the export status.     |
| _retryInterval_   | `number`                | The interval between status check retries in seconds.              |

For instance, the example below exports the latest version of a service and packages
all its associated files into a zip file.

```ts
await spark.services.export({
  folder: 'my-folder',
  service: 'my-service',
  filters: { version: 'latest' },
  maxRetries: 5,
  retryInterval: 3,
});
```

### Returns

When successful, this method returns an array of exported entities, where each entity
is an `HttpResponse` object with the buffer containing the exported entity.

## Import Spark services

This method imports a Spark service from a zip file into the Spark platform. The
zip file must be in the correct format and contain the necessary files to import
the service. That is to say, only zip files that were previously exported using
file type `migrate` can be imported.

Similarly, this method is a wrapper around the [Spark.impex.import()](./impex.md#import-spark-entities)
with the exception that it only imports services.

### Arguments

You must provide a readable stream of the zip file to import and a service URI
locator. The method accepts a set of optional parameters to customize the import
process.

| Property        | Type                              | Description                                                                             |
| --------------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| _destination_   | `ImportDestination`               | The destination service URI (required).                                                 |
| _file_          | `Readable`                        | The ZIP file containing the exported entities (required).                               |
| _config_        | `Config`                          | The workspace configuration if different from current.                                  |
| _ifPresent_     | `abort \| replace \| add_version` | What to do if the entity already exists in the destination (defaults to `add_version`). |
| _sourceSystem_  | `string`                          | The source system name to import from (e.g., `Spark JS SDK`).                           |
| _correlationId_ | `string`                          | The correlation ID for the import (useful for tagging).                                 |
| _maxRetries_    | `number`                          | The maximum number of retries when checking the import status.                          |
| _retryInterval_ | `number`                          | The interval between status check retries in seconds.                                   |

> [!IMPORTANT]
> The `destination` property is a way to specify how the service mapping should be
> done during the import process. When it's a `string`, the SDK will assume that
> the source and target folders are the same. If you want to map the service to a
> different folder, you must provide an object with `source` and `target` properties.

```ts
import { createReadStream } from 'fs';

await spark.services.import({
  destination: { source: 'my-folder-source/my-service', target: 'my-folder-target/my-service' },
  file: createReadStream('path/to/my-service.zip'),
  maxRetries: 5,
  retryInterval: 3,
});
```

### Returns

This method returns a JSON payload containing the import summary and the imported
entities have been created/mapped in the destination tenant. See the example in the
[import method](./impex.md#import-spark-entities) for a sample response.

## Delete a Spark service

This method allows you to delete an existing Spark service using its folder and
service names.

> [!WARNING]
> This method should be used with caution as it will delete the service, including all its
> versions. Once deleted, the service cannot be recovered.

### Arguments

You may provide the service URI as a string or an object with the folder and service
names.

```ts
await spark.services.delete('my-folder/my-service');
// or
await spark.services.delete({ folder: 'my-folder', service: 'my-service' });
```

### Returns

The method returns a successful status when the service is deleted.

```json
{
  "status": "Success",
  "data": null,
  "message": null,
  "errorCode": null
}
```

[Back to top](#services-api) or [Next: Batches API](./batches.md)

<!-- References -->

[v3-format]: https://docs.coherent.global/spark-apis/execute-api/execute-api-v3
[v4-format]: https://docs.coherent.global/spark-apis/execute-api/execute-api-v4
