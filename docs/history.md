<!-- markdownlint-disable-file MD024 -->

# Log History API

| Verb                                  | Description                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `Spark.logs.rehydrate(uri, [callId])` | [Rehydrate the executed model into the original excel file](#rehydrate-the-executed-model). |
| `Spark.logs.download(uri, [type])`    | [Download service execution logs as csv or json file](#download-service-execution-logs).    |

> [!WARNING]
> The service execution history is a good source of truth for auditing and debugging
> purposes. Though practical, log history is not intended to be a data storage solution.
> So, do use the following methods **responsibly**.

## Rehydrate the executed model

This method allows you to "rehydrate" the executed model into the original excel file
and download it to your local machine.

> Rehydration is the process of regenerating the model with the input data used
> during the execution.

### Arguments

You may indicate the service URI and the call ID as `string` arguments.

```ts
await spark.logs.rehydrate('my-folder/my-service', 'call-id');
```

Or, you can conveniently pass in the parameters as an `object`, which
includes the service URI and the call ID. Otherwise, it will throw a `SparkSdkError`.

| Property  | Type     | Description                                                                                                 |
| --------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| _folder_  | `string` | The folder name.                                                                                            |
| _service_ | `string` | The service name.                                                                                           |
| _callId_  | `string` | The call ID of the service execution.                                                                       |
| _index_   | `number` | For [v4 format][v4-format], indicate which record of the list to rehydrate (e.g., `0` is the first record). |

```ts
await spark.logs.rehydrate({ folder: 'my-folder', service: 'my-service', callId: 'call-id' }); // for v3 format
// or
await spark.logs.rehydrate({ folder: 'my-folder', service: 'my-service', callId: 'call-id', index: 0 }); // for v4 format
```

Do note that the `index` parameter is only valid for the synchronous batch execution (aka v4 format).
If you're rehydrating an API call log that used v4 format and you do not specify the `index` parameter,
the Spark platform will default to the last record. And if the `index` is out of bounds, the platform will
throw a bad request error.

> [!TIP]
> Another way of achieving the same result is by setting the `downloadable` metadata
> field as `true` at the time of executing the service. See the
> [Spark.services.execute()](./services.md#execute-a-spark-service) method for more information.

### Returns

when successful, this method returns:

- a buffer containing the file content (excel file);
- a JSON payload including essential information such as the download URL.

**JSON payload example:**

```json
{
  "status": "Success",
  "response_data": {
    "download_url": "https://entitystore.my-env.coherent.global/docstore/api/v1/documents/versions/tokens/some-token/file.xlsx"
  },
  "response_meta": {
    "service_id": "uuid",
    "version_id": "uuid",
    "version": "1.2.3",
    "process_time": 0,
    "call_id": "uuid",
    "compiler_type": "Neuron",
    "compiler_version": null,
    "source_hash": null,
    "engine_id": "alpha-numeric-id",
    "correlation_id": null,
    "parameterset_version_id": null,
    "system": "SPARK",
    "request_timestamp": "1970-12-03T04:56:56.186Z"
  },
  "error": null
}
```

Here's a full example in Node of how to harness this method:

```ts
import { createWriteStream } from 'fs';
import Spark from '@cspark/sdk';

const spark = new Spark({ env: 'my-env', tenant: 'my-tenant', token: 'bearer token' });

spark.logs
  .rehydrate('my-folder/my-service', 'a-valid-call-id')
  .then((response) => {
    const file = createWriteStream('path/to/my-rehydrated-excel.xlsx');
    response.buffer.pipe(file); // write downloaded file to disk

    console.log(JSON.stringify(response.data, null, 2)); // print download info
  })
  .catch(console.error);
```

## Download service execution logs

This method allows you to download the service execution logs as a CSV or JSON file
to your local machine. Unlike the `rehydrate` method, this one initiates a download
job and continuously checks the status until the job is completed and finally downloads
the file. It throws a `SparkError` if the download job fails to produce a downloadable
file.

If you want to have more granular control over the download process, you can use
respectively the `Spark.logs.downloads.initiate(uri, [type])` and
`Spark.logs.downloads.getStatus(uri, [type])` methods to initiate a download
job and check its status until it's completed. Do note that the status check is
subject to a timeout when it reaches the maximum number of retries.

### Arguments

You may provide the service URI and the file type as `string`.

```ts
await spark.logs.download('my-folder/my-service', 'csv');
```

Alternatively, you can use the following parameters as an `object`, which should
include the service URI and some additional parameters to personalize the
download job.

| Property             | Type                       | Description                                                      |
| -------------------- | -------------------------- | ---------------------------------------------------------------- |
| _folder_ (required)  | `string`                   | The folder name.                                                 |
| _service_ (required) | `string`                   | The service name.                                                |
| _versionId_          | `string`                   | The particular service version for the download.                 |
| _type_               | `csv \| json`              | The file type (defaults to `json`).                              |
| _callIds_            | `string[]`                 | An array of call IDs to download logs for.                       |
| _startDate_          | `string \| number \| Date` | The start date (format: `YYYY-MM-DD[THH:MM:SS.SSSZ]`).           |
| _endDate_            | `string \| number \| Date` | The end date (format: `YYYY-MM-DD[THH:MM:SS.SSSZ]`).             |
| _correrationId_      | `string`                   | The correlation ID (possible fallback for `callIds`).            |
| _sourceSystem_       | `string`                   | The source system (possible fallback for `callIds`).             |
| _maxRetries_         | `number`                   | The maximum number of retries (defaults to `Config.maxRetries`). |
| _retryInterval_      | `number`                   | The interval between status check retries in seconds.            |

```ts
await spark.logs.download({
  folder: 'my-folder',
  service: 'my-service',
  type: 'csv',
  callIds: ['call-id-1', 'call-id-2'],
  startDate: '1970-01-01',
  endDate: Date.now(),
  maxRetries: 3,
});
```

### Returns

When successful, this method returns:

- a buffer containing the file content (zip file);
- a JSON payload including essential information such as the download URL.

**JSON payload example:**

```json
{
  "status": "Success",
  "response_data": {
    "download_url": "https://entitystore.my-env.coherent.global/docstore/api/v1/documents/versions/tokens/some-token/file.zip"
  },
  "response_meta": {
    // similar to the rehydrate method...
    "system": "SPARK",
    "request_timestamp": "1970-12-03T04:56:56.186Z"
  },
  "error": null
}
```

The downloaded zip file should contain the logs in the requested format. For example,
if you requested a JSON file, the logs should be similar to this:

```json
[
  {
    "EngineCallId": "uuid",
    "LogTime": "1970-12-03T04:56:56.186Z",
    "TransactionDate": "1970-12-03T04:56:56.186Z",
    "SourceSystem": "Spark JS SDK",
    "Purpose": "JSON Download",
    "UserName": "john.doe@coherent.global",
    "HostName": "excel.my-env.coherent.global",
    "Tenant": "my-tenant",
    "Service": "my-service",
    "Product": "my-folder",
    "EngineDetails": {
      "response_data": { "outputs": { "my_output": 42 }, "warnings": null, "errors": null, "service_chain": null },
      "response_meta": {
        "spark_total_time": 123,
        "service_id": "uuid",
        "version_id": "uuid",
        "version": "1.2.3",
        "process_time": 10,
        "call_id": "uuid",
        "compiler_type": "Neuron",
        "compiler_version": "1.12.0",
        "source_hash": null,
        "engine_id": "alpha-numeric-id",
        "correlation_id": "",
        "parameterset_version_id": null,
        "system": "SPARK",
        "request_timestamp": "1970-12-03T04:56:56.186Z"
      },
      "request_data": { "inputs": { "my_input": 13 } },
      "request_meta": {
        "service_uri": null,
        "service_id": "uuid",
        "version": "1.2.3",
        "version_id": "uuid",
        "transaction_date": "1970-12-03T04:56:56.186Z",
        "call_purpose": "JSON Download",
        "source_system": "Spark JS SDK",
        "correlation_id": "",
        "requested_output": null,
        "service_category": "",
        "compiler_type": "Neuron",
        "array_outputs": null,
        "response_data_inputs": false,
        "parameterset_version_id": null,
        "validation_type": null
      }
    }
  }
]
```

And its CSV equivalent should look like this:

```csv
Description,Log Time,Transaction date,Version,Version ID,User name,Source system,Correlation ID,Call purpose,Call ID,Calc time (ms),Total time (ms),my_input,my_output,Error Details,Warning Details
,1970-12-03T04:56:56+00:00,1970-12-03T04:56:56+00:00,1.2.3,uuid,john.doe@coherent.global,SPARK,,Spark JS SDK,uuid,10,561,13,42,,
```

Check out the [API reference](https://docs.coherent.global/spark-apis/api-call-history-apis/download-log-as-csv)
for more information.

[Back to top](#log-history-api) or [Next: ImpEx API](./impex.md)

<!-- References -->

[v4-format]: https://docs.coherent.global/spark-apis/execute-api/execute-api-v4
