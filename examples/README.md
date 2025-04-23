# SDK Examples

This directory contains example code demonstrating how to use the Coherent Spark
SDK for various operations. These examples serve as a reference for implementing
different features and functionalities of the Spark platform from a client standpoint.

## Getting Started

Assuming that you have cloned this repository, you can run any example:

1. Set up your environment as described in the [Contributing guidelines](../CONTRIBUTING.md):

   ```bash
   yarn install # Install dependencies
   ```

2. Configure your access:

   - Open `examples/index.ts`
   - Replace `'insert-my-access-token'` with your actual access token
   - Set the appropriate service URI (e.g., change 'my-folder/my-service' to your actual service path)

3. Run the examples:

   ```bash
   yarn run demo # Run the examples
   ```

> Note that this project was built using [Yarn](https://yarnpkg.com/getting-started) as the
> package manager. If you're using a different package manager, or you're in a
> different JavaScript runtime environment, you will need to use the appropriate
> command to run the script. Take a look at the [ecosystem](../ecosystem/) folder for
> more information.

## Choose Examples to Run

You can choose any example and run it by commenting/uncommenting the relevant
function calls in `index.ts`.

### Configuration (`config.ts`)

- Authentication and token management
- API Resource extension
- Configuration retrieval and logging

### Folders (`folders.ts`)

- Category management
- Folder CRUD operations
- File operations

### Services (`services.ts`)

- Service schema and metadata retrieval
- Service execution (single and batch)
- Service compilation and validation
- Service import/export
- Swagger documentation retrieval

### Transforms (`transforms.ts`)

- Transform listing and validation
- Transform management (save, get, delete)

### History (`history.ts`)

- Execution history retrieval
- History rehydration
- History download

### Import/Export (`impex.ts`)

- Service import/export operations
- WASM download functionality

### Batch Operations (`batches.ts`)

- Batch creation and execution
- Batch management

## Advanced Use Cases

The [use cases](./usecases/) are standalone projects that demonstrate common scenarios such as:

- [Execute records sequentially](usecases/api_v3_for_loop/readme.md)
- [Execute batch of records synchronously](usecases/api_v4_sync_batch/readme.md)
- [Promote services across tenants or environments](usecases/service_promotion/readme.md)
- [Validate JWTs against Keycloak](usecases/token_validation/readme.md)

> [!NOTE]
>
> - Each example file contains multiple functions demonstrating different aspects of the SDK
> - Examples can be run independently by commenting/uncommenting the relevant function calls in `index.ts`
> - Make sure to handle errors appropriately in production environments
> - Some examples may require specific service configurations or data formats
