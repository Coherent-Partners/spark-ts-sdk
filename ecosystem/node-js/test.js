const assert = require('assert');
const { SparkClient: Spark, SparkSdkError } = require('@cspark/sdk');

function test(description) {
  const spark = new Spark({ env: 'test', tenant: 'my-tenant', token: 'open' });

  assert(spark.config.baseUrl.full === 'https://excel.test.coherent.global/my-tenant');
  assert.throws(() => new Spark({ env: 'test', apiKey: 'some-key' }), SparkSdkError);
  console.log(description || 'All tests passed');
}

test();
