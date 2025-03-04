<!-- markdownlint-disable-file MD029 -->

# Common Use Cases

This folder contains a collection of common use cases that developers might have to
deal with on a regular basis when working with Coherent Spark. These use cases serve
as a reference and starting point for users building their own applications, providing
foundational examples that can be expanded into more complex solutions.

Each use case is a standalone Node project showcasing how to utilize the SDK
to achieve specific outcomes. The examples are categorized by their operations,
including data ingestion, data processing, and data export.

## Use Cases

- [Execute records sequentially](api_v3_for_loop/readme.md)
- [Execute batch of records synchronously](api_v4_sync_batch/readme.md)

## How to Run Use Cases

To run a use case, you need to download the use case folder with its underlying
content. Then, use [NPM] to install the dependencies and run the
Node.js scripts.

> [!NOTE]
> Follow the instructions on [Node's website](https://nodejs.org/en/download)
> to install it on your machine if you haven't done so already. If you clone this
> repository and set up your development environment with Node, [NPM] will be
> installed automatically as a dependency manager, althogh you are free to use
> another package manager (e.g., yarn or pnpm) if you prefer.

1. install the dependencies

```bash
npm install
```

2. replace the placeholders in the `index.js` file with your own values (usually Spark settings)

3. run the use case

```bash
npm start
```

If you encounter any issues, please refer to the use case's readme file for more
information on how to troubleshoot and resolve them.

Alternatively, clone the repository and installing the dependencies. Then, follow
the [contributing guidelines][contributing-url] to set up your development environment.

## Hybrid Runner

To make it easy to test some of the examples, we provide a "[volume of cylinder](volume-cylinder.zip)"
compiled WebAssembly (WASM) module that can be used in hybrid deployments. This WASM is
a simple module that calculates the volume of a cylinder based on its radius and height.

Most of the use cases are based on this module, so you may use this WASM to test
them out. For example, you will first need to start your hybrid runner with the
following command:

```bash
docker run --name wasm-server -p 3000:3000 \
  -v /Users/johndoe/models:/models \
  -e MODEL_LOCATION=/models \
  -e UPLOAD_ENABLED=true \
  -e USE_SAAS=false \
  ghcr.io/coherent-partners/nodegen-server:v1.44.1
```

Then, you can use the following JavaScript code to upload the WASM module to the hybrid runner:

> [!NOTE]
> Remember to add the `@cspark/wasm` package before running the code below.

```js
import fs from 'fs';
import { HybridClient } from '@cspark/wasm';

function main() {
  const hybrid = new HybridClient({ tenant: 'fieldengineering', token: 'open' });
  hybrid.services.upload(fs.createReadStream('volume-cylinder.zip')).then((response) => console.log(response.data));
}

main();
```

> [!TIP]
> Consider using `versionId` as service URI when working with sync batch processing
> (a.k.a Execute APIv4). It is a known issue we're working to resolve.

Once uploaded, you are ready to run use cases that play well with hybrid runners.
Remember to use `HybridClient` for hybrid runners instead of `SparkClient`,
which is for the SaaS-based API. Follow [this guide][hybrid-runner] if you need more
help working with hybrid runners.

[Back to top](#common-use-cases) or go to [Execute Records Sequentially](api_v3_for_loop).

<!-- References -->

[contributing-url]: https://github.com/Coherent-Partners/spark-ts-sdk/blob/main/CONTRIBUTING.md
[hybrid-runner]: https://github.com/Coherent-Partners/spark-ts-sdk/tree/main/packages/wasm
[npm]: https://docs.npmjs.com/downloading-and-installing-packages-locally
