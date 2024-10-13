# Changelog

All notable changes to this project will be documented in this file.
See [standard-version](https://github.com/conventional-changelog/standard-version)
for commit guidelines.

## 0.2.7 (2024-09-12)

- Update build configuration and package exports
- Update ESM target to ES2015 for backward compatibility
- Add support for deleting a service

## 0.2.6 (2024-09-02)

- Enable gzip and deflate encoding for request payload during service execution
- Execute a service using Transforms API
- Apply minor improvements

## 0.2.5 (2024-08-14)

- Easily extend additional API resources:
  - `Spark.extend(extension, config)` static method to add new resources to Spark client
  - `Spark.extend(resource | extension)` instance method to add new resources to Spark client
- Rehydrate service execution logs for v4 format using zero-based `RehydrateParams.index`
- Add GitHub issue templates

## 0.2.4 (2024-08-05)

- No longer support sourcemaps in the SDK
- Apply minor improvements in the base URL options
- Add members `env` and `service` to the `BaseUrl` class
- Add more test coverage in Spark configuration

## 0.2.3 (2024-07-16)

- Extract Spark settings from JWT token if enabled
- Refactor http fetch to throw `InternetError` when no internet connection is available
- Add more test coverage for the `ApiResource` class such as retry logic and error handling
- Update Batches API documentation

## 0.2.2 (2024-07-12)

- Fix `AbortController` polyfill for Node.js environments <= 14.17.0
- Use two response formats for `Spark.services.execute()`: `original` or `alike`
- Fix typos in the documentation

## 0.2.1 (2024-07-06) - Deprecated

- Breaking changes: merge `Spark.services.batches.execute()` (removed) into `Spark.services.execute()`
  - `Spark.services.execute()` now supports both sync batch and service executions
  - `Spark.services.execute()` now may return v3 or v4 service executions on demand
  - `Spark.services.batches` -> `Spark.batches`
  - `Spark.services.logs` -> `Spark.logs`
- Add support for external signals to abort long-running services
- Add documentation for the Batches API
- Validate URI parameters and save travel time to Spark APIs when invalid.

## 0.2.0 (2024-06-15)

- Breaking changes: pluralize collection names in the SDK
  - `Spark.folder` -> `Spark.folders`
  - `Spark.service` -> `Spark.services`
  - `Spark.service.batch` -> `Spark.services.batches`
  - `Spark.service.log` -> `Spark.services.logs`
  - `Spark.batch` -> `Spark.batches`
- Apply minor improvements to the base Uri options
- Enfore no-console lint rule

## 0.1.2 (2024-05-15)

- Fix get status of batch pipeline
- Add get batch pipeline info method
- Mask sensitive information (e.g., API key, OAuth credentials)

## 0.1.1 (2024-05-01)

- Add support for async Batch API (experimental feature)
- Apply minor improvements to the SDK (e.g., analytics)

## 0.1.0 (2024-04-25)

- Add support for Node.js ^14.15.0 or higher
- Fix bug in `Config.copyWith` (it was not copying the tenant name correctly)
- Fix file upload in browser environments
- Refactor `Config.interceptors` and `Config.headers` to be more flexible
- Refactor CI/CD workflows to test multiple Node.js versions and environments

## 0.1.0-beta.x (2024-04-18)

- Add documentation comments
- Update readme.
- Add documentation for SDK usage
- Add a logger facade
- Add experimental verbs (currently being tested)
- Update build configuration and package exports
- Fix ESM build
- Add support for API call history.
