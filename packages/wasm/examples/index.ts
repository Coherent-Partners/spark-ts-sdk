import { HybridClient } from '../src';

import Services from './services';

const hybrid = new HybridClient({ tenant: 'my-tenant', token: 'open' });

async function main() {
  const response = await HybridClient.healthCheck();
  console.log(response.data);
}

main();
Services.upload(hybrid);
Services.execute(hybrid);
