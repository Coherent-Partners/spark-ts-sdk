/**
 * Instructions on how to run an example:
 * 1. set up the base URL and access token
 * 2. locate the example you want to run (e.g., Service.getSchema() => examples/service.ts)
 * 3. edit the service URI accordingly (e.g., 'my-folder/my-service' => 'your-folder/your-service')
 * 4. comment out the unneeded examples
 * 5. run the example using `yarn run demo`
 */
import Spark from '../src';

import Config from './config';
import Folder from './folder';
import Service from './service';
import History from './history';
import Wasm from './wasm';

const token = 'insert-your-access-token';
const spark = new Spark({ token, env: 'your-env', tenant: 'your-tenant' });

Config.retrieveToken(spark);
Wasm.download(spark);

Folder.getCategories(spark);
Folder.create(spark);
Folder.find(spark);
Folder.update(spark);
Folder.delete(spark);
Folder.downloadFile();

Service.getSchema(spark);
Service.getMetadata(spark);
Service.getVersions(spark);
Service.getSwagger(spark);
Service.download(spark);
Service.execute(spark);
Service.batchSync(spark);
Service.recompile(spark);
Service.export(spark);
Service.validate(spark);

History.rehydrate(spark);
History.download(spark);
