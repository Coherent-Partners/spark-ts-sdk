/**
 * Instructions on how to run an example:
 * 1. set up the base URL and access token
 * 2. locate the example you want to run (e.g., Service.getSchema() => examples/service.ts)
 * 3. edit the service URI accordingly (e.g., 'my-folder/my-service' => 'insurance/pet-rater')
 * 4. comment out the unneeded examples
 * 5. run the example using `yarn run demo`
 */
import Spark from '../src';

import Config from './config';
import Folder from './folders';
import Service from './services';
import History from './history';
import ImpEx from './impex';
import Batch from './batches';

const token = 'insert-my-access-token';
const spark = new Spark({ token, env: 'my-env', tenant: 'my-tenant' });

Config.build(token);
Config.printLogs();
Config.retrieveToken(spark);
Config.extendResource(spark);

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
Service.executeOne(spark);
Service.executeMany(spark);
Service.recompile(spark);
Service.export(spark);
Service.validate(spark);

History.find(spark);
History.rehydrate(spark);
History.download(spark);

ImpEx.export(spark);
ImpEx.import(spark);
ImpEx.downloadWasm(spark);

Batch.create(spark);
Batch.createAndRun(spark);
