<!-- markdownlint-disable-file MD024 -->

# ImpEx API

| Verb                       | Description                                                                       |
| -------------------------- | --------------------------------------------------------------------------------- |
| `Spark.impex.export(data)` | [Export Spark entities (versions, services, or folders)](#export-spark-entities). |
| `Spark.impex.import(data)` | [Import exported Spark entities into your workspace](#import-spark-entities).     |

## Export Spark entities

This method relies on the [Export API][export-api] to export Spark entities from
your tenant. This method lets you go as specific as you want, allowing you to export
only the entities you need. You may choose to export specific versions, services,
or folders.

### Arguments

You may pass in the specs as an `object` with the following properties:

| Property          | Type                    | Description                                                                     |
| ----------------- | ----------------------- | ------------------------------------------------------------------------------- |
| _folders_         | `string[]`              | The folder names.                                                               |
| _services_        | `string[]`              | The service URIs.                                                               |
| _versionIds_      | `string[]`              | The version UUIDs of the desired service.                                       |
| _filters_         | `object`                | How to filter out which entities to export.                                     |
| _filters.file_    | `migrate \| onpremises` | Whether it's for data migration or on-prem deployments (defaults to `migrate`). |
| _filters.version_ | `latest \| all`         | Which version of the file to export (defaults to `all`).                        |
| _sourceSystem_    | `string`                | The source system name to export from (e.g., `Spark JS SDK`).                   |
| _correlationId_   | `string`                | The correlation ID for the export (useful for tagging).                         |
| _maxRetries_      | `number`                | The maximum number of retries when checking the export status.                  |
| _retryInterval_   | `number`                | The interval between status check retries in seconds.                           |

> **NOTE**: Remember that a service URI is in the format `folder/service[?version]`.

Check out the [API reference](https://docs.coherent.global/spark-apis/impex-apis/export#request-body)
for more information.

```ts
await spark.impex.export({
  services: ['my-folder/my-service[0.4.2]', 'my-other-folder/my-service'],
  filters: { file: 'onpremises' },
  sourceSystem: 'Spark JS SDK',
  maxRetries: 5,
  retryInterval: 3,
});
```

### Returns

When successful, this method returns an array of exported entities, where each entity
is an `HttpResponse` object with the buffer containing the exported entity.

### Non-Transactional Methods

This method is transactional. It will initiate an export job, poll its status
until it completes, and download the exported files. If you need more control over
these steps, consider using the `exports` resource directly. You may use the following
methods:

- `Spark.impex.exports.initiate(data)`: Create an export job.
- `Spark.impex.exports.getStatus(jobId)`: Get the status of an export job.
- `Spark.impex.exports.download(result)`: Download the exported files.

## Import Spark entities

This method lets you import exported Spark entities into your workspace. The exported
entities are in the form of a ZIP file and should include all the necessary files
to recreate them in your tenant. Keep in mind that only entities for data migration
can be imported into Spark.

### Arguments

You may pass in the specs as an `object` with the following properties:

| Property        | Type                              | Description                                                                       |
| --------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| _file_          | `Readable`                        | The ZIP file containing the exported entities.                                    |
| _destination_   | `ImportDestination`               | The destination service URI.                                                      |
| _ifPresent_     | `abort \| replace \| add_version` | What to do if the entity already exists in the destination (defaults to `abort`). |
| _sourceSystem_  | `string`                          | The source system name to import from (e.g., `Spark JS SDK`).                     |
| _correlationId_ | `string`                          | The correlation ID for the import (useful for tagging).                           |
| _maxRetries_    | `number`                          | The maximum number of retries when checking the import status.                    |
| _retryInterval_ | `number`                          | The interval between status check retries in seconds.                             |

The `destination` folder should exist in the tenant in order to import the entities.
When `destination` is of `string` type, it should be formatted as `folder/service[?version]`.
However, you can define how to map the exported entities to the destination tenant
by providing a `ServiceMapping` object.

| Property  | Type                      | Description                                         |
| --------- | ------------------------- | --------------------------------------------------- |
| _source_  | `string`                  | The service URI of the source tenant.               |
| _target_  | `string`                  | The service URI of the destination tenant.          |
| _upgrade_ | `major \| minor \| patch` | The version upgrade strategy (defaults to `minor`). |

Check out the [API reference](https://docs.coherent.global/spark-apis/impex-apis/import#request-body)
for more information.

```ts
import { createReadStream } from 'fs';

await spark.impex.import({
  file: createReadStream('path/to/exported/entities.zip'),
  destination: ['my-folder/my-service', 'my-other-folder/my-service'],
  ifPresent: 'add_version',
  maxRetries: 5,
  retryInterval: 3,
});
```

### Returns

When successful, this method returns a JSON payload containing the import summary and
the imported entities have been created/mapped in the destination tenant. See the example
below for a sample response.

```json
{
  "object": "import",
  "id": "uuid",
  "response_timestamp": "1970-12-03T04:56:78.186Z",
  "status": "closed",
  "status_url": "https://excel.my-env.coherent.global/my-tenant/api/v4/import/job-uuid/status",
  "process_time": 123,
  "outputs": {
    "services": [
      {
        "service_uri_source": "my-folder/my-service",
        "folder_source": "my-folder",
        "service_source": "my-service",
        "folder_destination": "my-folder",
        "service_destination": "my-service",
        "service_uri_destination": "my-folder/my-service",
        "service_id_destination": "uuid",
        "status": "added"
      }
    ],
    "service_versions": [
      {
        "service_uri_source": "my-folder/my-service[0.1.0]",
        "folder_source": "my-folder",
        "service_source": "my-service",
        "version_source": "0.1.0",
        "version_id_source": "uuid",
        "folder_destination": "floherent",
        "service_destination": "petFinder",
        "version_destination": "0.1.0",
        "service_uri_destination": "my-folder/my-service[0.1.0]",
        "service_id_destination": "uuid",
        "version_id_destination": "uuid",
        "status": "added"
      },
      {
        "service_uri_source": "my-folder/my-service[0.2.0]",
        "folder_source": "my-folder",
        "service_source": "my-service",
        "version_source": "0.2.0",
        "version_id_source": "uuid",
        "folder_destination": "my-folder",
        "service_destination": "my-service",
        "version_destination": "0.2.0",
        "service_uri_destination": "my-folder/my-service[0.2.0]",
        "service_id_destination": "uuid",
        "version_id_destination": "uuid",
        "status": "added"
      }
    ]
  },
  "errors": null,
  "warnings": [],
  "source_system": "Spark JS SDK",
  "correlation_id": null
}
```

### Non-Transactional Methods

Being transactional, this method will create an import job, and poll its status
continuously until it completes the import process. You may consider using the
`imports` resource directly and control the import process manually:

- `Spark.impex.imports.initiate(data)`: Create an import job.
- `Spark.impex.imports.getStatus(jobId)`: Get the status of an import job.

## Good to know

The `Spark.impex.export` and `Spark.impex.import` methods together provide a way to
migrate data between Spark tenants. You can export entities from one tenant and import
them into another. For that, you can set up both the source and destination tenant
configuration using the following:

```ts
const spark = new Spark({ env: 'uat', tenant: 'my-tenant' });
const targetConfig = new Spark({ env: 'prod', tenant: 'my-tenant' }).config;

// build setup for migration between tenants
const migration = spark.migration(targetConfig);
```

Then, you can use the non-transactional methods to control the export and import
processes manually. For example, initiate an export job should be done as follows:

```ts
await migration.exports.initiate({ services: ['my-folder/my-service[0.1.0]'] });
```

Remember that exporting and importing entities is a time-consuming process. Be sure
to use enough retries and intervals to avoid timeouts.

<!-- References -->

[export-api]: https://docs.coherent.global/spark-apis/impex-apis/export
