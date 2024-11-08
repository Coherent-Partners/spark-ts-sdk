/**
 * Instructions on how to run an example:
 * 1. set up the base URL if needed
 * 2. locate the example you want to run (e.g., Service.execute() => examples/service.ts)
 * 3. edit the service URI accordingly (e.g., 'my-folder/my-service' => 'insurance/pet-rater')
 * 4. comment out the unneeded examples
 * 5. run the example using `yarn demo`
 */
import { HybridClient } from '../src';

import Services from './services';
import Misc from './misc';

const hybrid = new HybridClient({ tenant: 'my-tenant', token: 'open' });

Misc.healthCheck(hybrid);
Misc.getVersion(hybrid);

Services.upload(hybrid);
Services.execute(hybrid);
