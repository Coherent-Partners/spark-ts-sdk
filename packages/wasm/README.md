# @cspark/wasm

[![npm version][version-img]][version-url]

This Coherent Spark Node.js SDK provides a convenient way to interact with the
[Hybrid Runner][hybrid-runner] API.

> This guide assumes that you are familiar with Coherent Spark's hybrid deployments.
> Otherwise, visit the [User Guide][user-guide] to learn more about it.

## Installation

```bash
npm i @cspark/wasm
```

> **Note:** `@cspark/wasm` requires [Node.js 14.15](https://nodejs.org/en/download/current)
> or higher. It also supports other environments such as browsers, [Bun](https://bun.sh),
> and [Deno](https://deno.com).

## Peer Dependencies

`@cspark/wasm` is an extension of [`@cspark/sdk`][cspark-sdk].

Obviously, a runner offers a smaller subset of functionality compared to the SaaS API,
however, extending `@cspark/sdk` to support the Hybrid Runner API is a good way
to keep the codebase consistent and maintainable. This means, you will need to
install the `@cspark/sdk` package as a peer dependency. That also means that you may
want to check its [documentation][cspark-sdk] to learn about its client options,
error handling, and other features.

## Usage

To interact with the Hybrid Runner API, create a `HybridClient` that points to the
runner's base URL (by default: `http://localhost:3000`). Depending on your hybrid
runner's configuration, you may or may not need to use authentication.

```ts
import Hybrid from '@cspark/wasm';

function main() {
  const hybrid = new Hybrid({ tenant: 'my-tenant', token: 'open' }); // no authentication

  hybrid.services
    .execute('my-folder/my-service', { inputs: { value: 42 } })
    .then((response) => console.log(response.data))
    .catch(console.error);
}

main();
```

Explore the [examples] and [docs] folders to find out more about its capabilities.

## Contributing

Visit [CONTRIBUTING.md][contributing-url] for details on the contribution guidelines,
the code of conduct, and the process for submitting pull requests.

## Copyright and License

[Apache-2.0][license-url]

<!-- References -->

[version-img]: https://img.shields.io/npm/v/@cspark/wasm
[version-url]: https://www.npmjs.com/package/@cspark/wasm
[contributing-url]: https://github.com/Coherent-Partners/spark-ts-sdk/blob/main/CONTRIBUTING.md
[license-url]: https://github.com/Coherent-Partners/spark-ts-sdk/blob/main/LICENSE
[cspark-sdk]: https://www.npmjs.com/package/@cspark/sdk
[user-guide]: https://docs.coherent.global/integrations/how-to-deploy-a-hybrid-runner
[hybrid-runner]: https://github.com/orgs/Coherent-Partners/packages/container/package/nodegen-server
[examples]: https://github.com/Coherent-Partners/spark-ts-sdk/blob/main/packages/wasm/examples/index.ts
[docs]: https://github.com/Coherent-Partners/spark-ts-sdk/blob/main/packages/wasm/docs/readme.md
