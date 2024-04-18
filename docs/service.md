<!-- markdownlint-disable-file MD024 -->

# Service API

| Verb                                     | Description                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `Spark.service.create(data)`             | [Create a new Spark service](#create-a-new-spark-service).                         |
| `Spark.service.execute(uri, data)`       | [Execute a Spark service](#execute-a-spark-service).                               |
| `Spark.service.batch.execute(uri, data)` | [Execute multiple records synchronously](#execute-multiple-records-synchronously). |
| `Spark.service.getVersions(uri)`         | [Get all the versions of a service](#get-all-the-versions-of-a-service).           |
| `Spark.service.getSwagger(uri)`          | [Get the Swagger documentation of a service](#get-the-swagger-documentation).      |
| `Spark.service.getSchema(uri)`           | [Get the schema for a given service](#get-the-schema-for-a-service).               |
| `Spark.service.getMetadata(uri)`         | [Get the metadata of a service](#get-the-metadata-of-a-service).                   |
| `Spark.service.download(uri)`            | [Download the excel file of a service](#download-the-excel-file-of-a-service).     |
| `Spark.service.recompile(uri)`           | [Recompile a service using specific compiler version](#recompile-a-service).       |
| `Spark.service.validate(uri, data)`      | [Validate input data using static or dynamic validations](#validate-input-data).   |
| `Spark.service.export(uri)`              | [Export Spark services as a zip file](#export-spark-services).                     |
| `Spark.service.import(data)`             | [Import a Spark service from a zip file](#import-spark-services).                  |

## Create a new Spark service

A Spark service is the representation of your Excel file in the Spark platform.
This method helps you create a new service in Spark by uploading the Excel file,
compiling it into a [WASM module](./misc.md), and publishing a new version of it
as a service.

If you're uncertain of how to prepare an Excel file for Spark, please refer to the
[Spark documentation](https://docs.coherent.global/getting-started-in-5-minutes)
for more information.

> [!IMPORTANT]
> You must create a folder before creating a service. Please refer to the
> [Folder API](./folder.md) to learn more about creating a folder.

### Arguments

This method accepts an extended version of `UriParams` object as an argument.

| Property        | Type                       | Description                                                                |
| --------------- | -------------------------- | -------------------------------------------------------------------------- |
| _folder_        | `string`                   | The folder name.                                                           |
| _service_       | `string`                   | The service name.                                                          |
| _file_          | `Readable`                 | The file as a readable stream.                                             |
| _fileName_      | `string`                   | The name of the Excel file (defaults to `UriParams.service`).              |
| _versioning_    | `major \| minor \| patch`  | This indicates how to increment the service version (defaults to `minor`). |
| _startDate_     | `number \| string \| Date` | The effective start date (defaults to `Date.now()` ).                      |
| _endDate_       | `number \| string \| Date` | The effective end date (defaults to 10 years later).                       |
| _draftName_     | `string`                   | This overrides the `service` name to a custom name.                        |
| _trackUser_     | `boolean`                  | Track the user who created the service (defaults to `false`).              |
| _maxRetries_    | `number`                   | The number of retries to attempt (defaults to `Config.maxRetries`).        |
| _retryInterval_ | `number`                   | The interval between retries in seconds (defaults to `1` second).          |

```ts
await spark.service.create({
  folder: 'my-folder',
  service: 'my-service',
  file: fs.createReadStream('path/to/my-service.xlsx'),
  fileName: 'my-service.xlsx',
  versioning: 'patch',
  trackUser: true,
  maxRetries: 10,
  retryInterval: 3,
});
```

This method may take a while to run depending on the size of the Excel file and
the complexity of the service. It's recommended to allocate enough time for the
method to complete. Therefore, `maxRetries` and `retryInterval` are provided to
help you manage the process.

Here's a hierarchy of the service creation process:

- `Spark.service.create` (1)
  - `Spark.service.compile` (2)
    - `Spark.service.compilation.initiate` (3)
    - `Spark.service.compilation.getStatus` (4)
  - `Spark.service.publish` (5)

If you want to have more control, you can call the methods in the hierarchy
individually. For example, if you only want to compile the service, you can call
`Spark.service.compile` directly, which will only execute steps (3) and (4).

### Returns

This method returns a JSON with detailed information on the upload, compilation,
and publication process.

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
      "service_id": null,
      "version_id": "{versionID}",
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

This method executes a Spark service with the given input data. It uses the API v3
format to execute the service.

Check out the [API reference](https://docs.coherent.global/spark-apis/execute-api/execute-api-v3)
to learn more about the API v3 format of the inputs and outputs.

### Arguments

The method accepts a string or a `UriParams` object and optionally a second object
with the input data as arguments. See the use cases below.

- **Default inputs**:
  the following example demonstrates how to execute a service with default values.
  Obviously, the SDK ignores what those default values are. Under the hood, the SDK
  uses an empty object `{}` as the input data, which is an indicator for Spark to
  use the default inputs defined in the Excel file.

```ts
await spark.service.execute('my-folder/my-service');
// or
await spark.service.execute({ folder: 'my-folder', service: 'my-service' });
```

- **Inputs only**:
  the above example is the simplest form of executing a service. In most cases, you
  will need to provide input data to the service. You can do so by passing an `inputs`
  object as the second argument.

```ts
const inputs = { my_input: 13 };
await spark.service.execute('my-folder/my-service', { inputs });
// or
await spark.service.execute('my-folder/my-service', { data: { inputs } });
```

- **Inputs with metadata**: you can also provide metadata along with the input data.

```ts
const inputs = { my_input: 13 };
const metadata = { subservices: 'sum,product', callPurpose: 'Demo' };
await spark.service.execute('my-folder/my-service', { data: { inputs, ...metadata } });
```

- **Raw data**:
  you may use JSON string data as shown in the [API Tester](https://docs.coherent.global/navigation/api-tester).
  Basically, you are free to work with raw data as long as it's a valid JSON
  string and follows the API v3 format.

```ts
const raw = `{
  "request_data": { "inputs": { "my_input": 13 } },
  "request_meta": { "version_id": "uuid", "call_purpose": "Demo" }
}`;

await spark.service.execute('my-folder/my-service', { raw });
```

The previous examples will execute the latest version of a service. If you want
to execute a specific version, you can do the following:

- using **versionId** (the fastest):
  `versionId` is the UUID of a particular version of the service.

```ts
await spark.service.execute('version/uuid');
// or
await spark.service.execute({ folder: 'my-folder', service: 'my-service', versionId: 'uuid' });
// or
await spark.service.execute('my-folder/my-service', { data: { versionId: 'uuid' } });
```

- using **serviceId**:
  `serviceId` is the UUID of the service. It will execute the latest version of the service.

```ts
await spark.service.execute('service/uuid');
// or
await spark.service.execute({ folder: 'my-folder', service: 'my-service', serviceId: 'uuid' });
// or
await spark.service.execute('my-folder/my-service', { data: { serviceId: 'uuid' } });
```

- using semantic **version**:
  `version` also known as revision number is the semantic version of the service.

```ts
await spark.service.execute('my-folder/my-service[0.1.0]');
// or
await spark.service.execute({ folder: 'my-folder', service: 'my-service', version: '0.1.0' });
// or
await spark.service.execute('my-folder/my-service', { data: { version: '0.1.0' } });
```

- using **proxy** endpoints:
  `proxy` is the custom endpoint associated with the service.

```ts
await spark.service.execute('my-proxy/endpoint');
```

As you can tell, there are multiple flavors when it comes to locating a Spark
service and executing it. You can choose the one that suits best your needs. Here's
a summary of the parameters you can use for this method:

For the first argument, `UriParams` object:

| Property    | Type      | Description                                      |
| ----------- | --------- | ------------------------------------------------ |
| _folder_    | `string`  | The folder name.                                 |
| _service_   | `string`  | The service name.                                |
| _versionId_ | `string`  | The UUID of a particular version of the service. |
| _serviceId_ | `string`  | The service UUID.                                |
| _version_   | `string`  | The semantic version of the service.             |
| _proxy_     | `string`  | The custom endpoint associated with the service. |
| _public_    | `boolean` | Whether to use the public endpoint.              |

For the second argument, `ExecuteParams` object:

| Property             | Type                       | Description                                                     |
| -------------------- | -------------------------- | --------------------------------------------------------------- |
| _inputs_             | `Record<string, any>`      | The input data.                                                 |
| _raw_                | `string`                   | The input data in its raw form.                                 |
| _data_               | `ExecuteData<Inputs>`      | Executable input data with metadata.                            |
| _data.inputs_        | `Record<string, any>`      | Alternate way to pass in input data.                            |
| _data.serviceUri_    | `string`                   | The service URI.                                                |
| _data.versionId_     | `string`                   | The version ID of the service.                                  |
| _data.serviceId_     | `string`                   | The service UUID.                                               |
| _data.version_       | `string`                   | The semantic version.                                           |
| _data.activeSince_   | `string \| number \| Date` | The transaction date.                                           |
| _data.sourceSystem_  | `string`                   | The source system.                                              |
| _data.correlationId_ | `string`                   | The correlation ID.                                             |
| _data.callPurpose_   | `string`                   | The call purpose.                                               |
| _data.outputs_       | `string \| string[]`       | The array of output names.                                      |
| _data.compilerType_  | `string`                   | The compiler type (e.g., `Neuron`).                             |
| _data.debugSolve_    | `boolean`                  | Enable debugging for solve functions.                           |
| _data.output_        | `string \| string[]`       | Expect specific requested output.                               |
| _data.outputRegex_   | `string`                   | Expect specific requested output using regex.                   |
| _data.withInputs_    | `boolean`                  | Whether to include input data in the response.                  |
| _data.subservices_   | `string \| string[]`       | The comma-separated subservice names if string.                 |
| _data.downloadable_  | `boolean`                  | Whether to include a download URL of the Excel in the response. |

### Returns

This method returns the output data of the service execution in the following
format (aka v3 format).

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

> [!TIP]
> When using TypeScript, you can define both input and output data as interfaces
> to help you work with the data more efficiently. See the example below.

```ts
interface Inputs {
  my_input: number;
}

interface Outputs {
  my_output: number;
}

const inputs: Inputs = { my_input: 13 };
const response = await spark.service.execute<Inputs, Outputs>('my-folder/my-service', { inputs });
console.log(response.data.response_data.outputs.my_output); // 42
```

## Execute multiple records synchronously

This method helps you execute multiple records synchronously. It's useful when you
have a batch of records to process and you want to execute them all at once. This
operation is similar to the `Spark.service.execute` method but with multiple records.

### Arguments

The method accepts a string or a `UriParams` object and a second object with the
input data as arguments.

```ts
const data = {
  inputs: [{ value: 11 }, { value: 12 }, { value: 13 }],
  callPurpose: 'Batch execution',
};

await spark.service.batch.execute('my-folder/my-service', { data });
```

To have a full overview of the parameters, see the `UriParams` and `ExecuteParams<Inputs>`
objects [here](../src/resources/batch.ts).

For the first argument, `UriParams` object:

| Property    | Type      | Description                          |
| ----------- | --------- | ------------------------------------ |
| _folder_    | `string`  | The folder name.                     |
| _service_   | `string`  | The service name.                    |
| _versionId_ | `string`  | The version UUID of the service.     |
| _serviceId_ | `string`  | The service UUID.                    |
| _version_   | `string`  | The semantic version of the service. |
| _public_    | `boolean` | Whether to use the public endpoint.  |

For the second argument, `ExecuteParams<Inputs>` object:

| Property             | Type                       | Description                           |
| -------------------- | -------------------------- | ------------------------------------- |
| _inputs_             | `any[]`                    | The input data.                       |
| _raw_                | `string`                   | The input data in its raw form.       |
| _data_               | `ExecuteData<Inputs>`      | Executable input data with metadata.  |
| _data.inputs_        | `any[]`                    | Alternate way to pass in input data.  |
| _data.serviceUri_    | `string`                   | The service URI.                      |
| _data.versionId_     | `string`                   | The version ID of the service.        |
| _data.activeSince_   | `string \| number \| Date` | The transaction date.                 |
| _data.sourceSystem_  | `string`                   | The source system.                    |
| _data.correlationId_ | `string`                   | The correlation ID.                   |
| _data.callPurpose_   | `string`                   | The call purpose.                     |
| _data.output_        | `string \| string[]`       | Expect specific requested output.     |
| _data.subservices_   | `string \| string[]`       | The comma-separated subservice names. |

### Returns

This method returns the output data of the service execution in the following
format (aka v4 format).

```json
{
  "outputs": [{ "my_output": 40 }, { "my_output": 41 }, { "my_output": 42 }],
  "process_time": [1, 1, 1],
  "warnings": [null, null, null],
  "errors": [null, null, null],
  "service_id": "uuid",
  "version_id": "uuid",
  "version": "0.4.2",
  "call_id": "uuid",
  "compiler_version": "1.12.0",
  "correlation_id": null,
  "request_timestamp": "1970-12-03T04:56:78.186Z"
}
```

Check out the [API reference](https://docs.coherent.global/spark-apis/execute-api/execute-api-v4#sample-request)
to learn more about the API v4 format of the inputs and outputs.

## Get all the versions of a service

This method returns all the versions of a service.

### Arguments

The method accepts a string or a `UriParams` object as an argument.

```ts
await spark.service.getVersions('my-folder/my-service');
// or
await spark.service.getVersions({ folder: 'my-folder', service: 'my-service' });
```

### Returns

```json
{
  "status": "Success",
  "message": null,
  "errorCode": null,
  "data": [
    {
      "id": "uuid",
      "createdAt": "1970-12-03T04:56:78.186Z",
      "engine": "my-service",
      "revision": "0.2.0",
      "effectiveStartDate": "1970-12-03T04:56:78.186Z",
      "effectiveEndDate": "1990-12-03T04:56:78.186Z",
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
      "createdAt": "1970-12-03T04:56:78.186Z",
      "engine": "my-service",
      "revision": "0.1.0",
      "effectiveStartDate": "1970-12-03T04:56:78.186Z",
      "effectiveEndDate": "1980-12-03T04:56:78.186Z",
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
}
```

## Get the Swagger documentation

This method returns the JSON content or downloads the swagger file of a particular service.

### Arguments

The method accepts a string or a `UriParams` object as an argument.

```ts
await spark.service.getSwagger('my-folder/my-service');
// or
await spark.service.getSwagger({ folder: 'my-folder', service: 'my-service' });
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
await spark.service.getSwagger({
  folder: 'my-folder',
  service: 'my-service',
  downloadable: true,
});
```

### Returns

See a [sample swagger JSON](./samples/service-swagger.json) for more information.

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
await spark.service.getSchema('my-folder/my-service');
// or
await spark.service.getSchema({ folder: 'my-folder', service: 'my-service' });
```

### Returns

See a [sample service schema](./samples/service-swagger.json) for more information.

## Get the metadata of a service

This method returns the metadata of a service.

### Arguments

The method accepts a string or a `UriParams` object as an argument.

```ts
await spark.service.getMetadata('my-folder/my-service');
// or
await spark.service.getMetadata({ folder: 'my-folder', service: 'my-service' });
```

### Returns

```json
{
  "status": "Success",
  "error": null,
  "response_data": {
    "outputs": {
      "Metadata.Date": "1970-01-23",
      "Metadata.Number": 456,
      "Metadata.Text": "DEF",
      "METADATA.IMAGE": "data:image/png;base64,..."
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
metadata for version control.

This method lets you download either the configured version or the original Excel
file of a service.

### Arguments

The method accepts a string or a `UriParams` object as an argument.

```ts
await spark.service.download('my-folder/my-service[0.4.2]');
// or
await spark.service.download({ folder: 'my-folder', service: 'my-service', version: '0.4.2' });
```

> **Note:** The version piece is optional. If not provided, the latest version
> will be downloaded.

You may use additional options to indicate whether you intend to download the
original Excel file or the configured version of it.

| Property   | Type                     | Description                                               |
| ---------- | ------------------------ | --------------------------------------------------------- |
| _fileName_ | `string`                 | Save the downloaded file with a different name.           |
| _type_     | `original \| configured` | The type of the file to download (defaults to `original`) |

```ts
await spark.service.download({
  folder: 'my-folder',
  service: 'my-service',
  version: '0.4.2',
  type: 'configured',
});
```

### Returns

When successful, the method returns an `HttpResponse` object with the buffer
containing the Excel file.

## Recompile a service

Every service in Spark is compiled using a specific compiler version -- usually
the latest one. However, you may want to recompile a service using a specific
compiler version for various reasons. Keep in mind that a service recompilation
is considered an update to the underlying Spark service but not to the Excel file
itself.

### Arguments

The method accepts a string or a `UriParams` object as an argument.

```ts
await spark.service.recompile('my-folder/my-service');
// or
await spark.service.recompile({ folder: 'my-folder', service: 'my-service' });
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
await spark.service.recompile({
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

> **Note:** This method works similarly to the `Spark.service.execute` method but
> with a different purpose. If you want to know more about the input and output
> data format, check the [excute(...)](#execute-a-spark-service) method.

### Arguments

This method follows the same pattern as the `execute` method. To specify which type
of validation to use, you must provide the `validationType` property as part of
the `ExecuteParams` object.

```ts
const inputs = { my_input: 13 };
const metadata = { validationType: 'dynamic', callPurpose: 'Demo' };
await spark.service.validate('my-folder/my-service', { data: { inputs, ...metadata } });
```

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
await spark.service.export('my-folder/my-service');
// or
await spark.service.export({ folder: 'my-folder', service: 'my-service' });
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
| _filters.version_ | `latest \| all`         | Which version of the file to export (defaults to `all`).           |
| _sourceSystem_    | `string`                | The source system name to export from (e.g., `Spark JS SDK`).      |
| _correlationId_   | `string`                | The correlation ID for the export (useful for tagging).            |
| _maxRetries_      | `number`                | The maximum number of retries when checking the export status.     |
| _retryInterval_   | `number`                | The interval between status check retries in seconds.              |

For example, the example below exports the latest version of a service and packages
all its associated files into a zip file.

```ts
await spark.service.export({
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

| Property        | Type                              | Description                                                                       |
| --------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| _destination_   | `ImportDestination`               | The destination service URI (required).                                           |
| _file_          | `Readable`                        | The ZIP file containing the exported entities (required).                         |
| _config_        | `Config`                          | The workspace configuration if different from current.                            |
| _ifPresent_     | `abort \| replace \| add_version` | What to do if the entity already exists in the destination (defaults to `abort`). |
| _sourceSystem_  | `string`                          | The source system name to import from (e.g., `Spark JS SDK`).                     |
| _correlationId_ | `string`                          | The correlation ID for the import (useful for tagging).                           |
| _maxRetries_    | `number`                          | The maximum number of retries when checking the import status.                    |
| _retryInterval_ | `number`                          | The interval between status check retries in seconds.                             |

> [!IMPORTANT]
> The `destination` property is a way to specify how the service mapping should be
> done during the import process. When it's a `string`, the SDK will assume that
> the source and target folders are the same. If you want to map the service to a
> different folder, you must provide an object with `source` and `target` properties.

```ts
import { createReadStream } from 'fs';

await spark.service.import({
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
