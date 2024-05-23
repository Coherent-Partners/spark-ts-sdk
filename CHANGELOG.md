# Changelog

All notable changes to this project will be documented in this file.
See [standard-version](https://github.com/conventional-changelog/standard-version)
for commit guidelines.

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

## 0.1.0-beta.3 (2024-04-18)

- Add documentation comments
- Update readme.

## 0.1.0-beta.2 (2024-04-16)

- Add documentation for SDK usage
- Add a logger facade
- Add experimental verbs (currently being tested)

## 0.1.0-beta.1 (2024-03-20)

- Update build configuration and package exports
- Fix ESM build
- Add support for API call history.

## 0.1.0-beta.0 (2024-02-28)

Initial beta release.
