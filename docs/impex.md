<!-- markdownlint-disable-file MD024 -->

# ImpEx API

| Verb                       | Description                                                                       |
| -------------------------- | --------------------------------------------------------------------------------- |
| `Spark.impex.export(data)` | [Export Spark entities (versions, services, or folders)](#export-spark-entities). |
| `Spark.impex.import(data)` | [Import exported Spark entities into your workspace](#import-spark-entities).     |

## Export Spark entities

This method relies on the [Export API][export-api] to export Spark entities from
a tenant workspace. You may choose to export either specific versions, services
or folders, or a combination of them, which eventually are packaged up into a zip
file that will be downloaded to your local machine.

### Arguments

The expected argument is an `object` with the following properties:

| Property          | Type                    | Description                                                        |
| ----------------- | ----------------------- | ------------------------------------------------------------------ |
| _folders_         | `string[]`              | 1+ folder name(s).                                                 |
| _services_        | `string[]`              | 1+ service URI(s).                                                 |
| _versionIds_      | `string[]`              | 1+ version UUID(s) of the desired service.                         |
| _filters_         | `object`                | Filter which entities to export.                                   |
| _filters.file_    | `migrate \| onpremises` | For data migration or on-prem deployments (defaults to `migrate`). |
| _filters.version_ | `latest \| all`         | Which version of the file to export (defaults to `latest`).        |
| _sourceSystem_    | `string`                | Source system name to export from (e.g., `Spark JS SDK`).          |
| _correlationId_   | `string`                | Correlation ID for the export (useful for tagging).                |
| _maxRetries_      | `number`                | Maximum number of retries when checking the export status.         |
| _retryInterval_   | `number`                | Interval between status check retries in seconds.                  |

> [!NOTE]
> Remember that a service URI can be one of the following:
>
> - `{folder}/{service}[?{version}]` or
> - `service/{serviceId}` or
> - `version/{versionId}`.

Check out the [API reference](https://docs.coherent.global/spark-apis/impex-apis/export#request-body)
for more information.

```ts
await spark.impex.export({
  services: ['my-folder/my-service[0.4.2]', 'my-other-folder/my-service-2'],
  filters: { file: 'onpremises' },
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

- `Spark.impex.exports.initiate(data)` creates an export job.
- `Spark.impex.exports.getStatus(jobId)` gets an export job's status.
- `Spark.impex.exports.download(result)` downloads the exported files as a ZIP.

## Import Spark entities

This method lets you import exported Spark entities into your workspace. Only entities
that were exported for data migration can be imported back into Spark.

### Arguments

The expected argument is an `object` with the following properties:

| Property        | Type                              | Description                                                                       |
| --------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| _file_          | `Readable`                        | The ZIP file containing the exported entities.                                    |
| _destination_   | `ImportDestination`               | The destination service URI.                                                      |
| _ifPresent_     | `abort \| replace \| add_version` | What to do if the entity already exists in the destination (defaults to `abort`). |
| _sourceSystem_  | `string`                          | Source system name to import from (e.g., `Spark JS SDK`).                         |
| _correlationId_ | `string`                          | Correlation ID for the import (useful for tagging).                               |
| _maxRetries_    | `number`                          | Maximum number of retries when checking the import status.                        |
| _retryInterval_ | `number`                          | Interval between status check retries in seconds.                                 |

The `destination` folder should exist in the target workspace to import the entities.
you can define how to map the exported entities to the destination tenant by providing
a `ServiceMapping` object.

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
the imported entities that have been created/mapped in the destination tenant.
See the sample response below

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
        "folder_destination": "my-folder",
        "service_destination": "my-service",
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

- `Spark.impex.imports.initiate(data)` creates an import job.
- `Spark.impex.imports.getStatus(jobId)` gets an import job's status.

## Good to Know

The `Spark.impex.export` and `Spark.impex.import` methods together provide a way to
migrate data between Spark tenants. In other words, you can export entities from one
tenant and import them into another. For that, you can set up both the source and
destination tenant configuration using the following:

```ts
import Spark from '@cspark/sdk';

// build setup for migration between tenants
const migration = Spark.migration(
  { env: 'uat', tenant: 'my-tenant', token: 'uat token' },
  { env: 'prod', tenant: 'my-tenant', token: 'prod token' },
);

// then use the transactional methods
migration
  .migrate({
    services: ['from-folder/my-service'],
    destination: 'to-folder/my-service',
    ifPresent: 'add_version',
  })
  .then(console.log)
  .catch(console.error);
```

Alternatively, you may use the non-transactional methods to control the export and import
processes manually. For example, initiate an export job should be done as follows:

```ts
await migration.exports.initiate({ services: ['my-folder/my-service[0.1.0]'] });
```

Remember that exporting and importing entities is a time-consuming process. Be sure
to use enough retries and intervals to avoid timeouts.

[Back to top](#impex-api) or [Next: Other APIs](./misc.md)

<!-- References -->

[export-api]: https://docs.coherent.global/spark-apis/impex-apis/export
