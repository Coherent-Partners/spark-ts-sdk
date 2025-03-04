import Spark, { SparkSdkError } from '@cspark/sdk';
import { assertEquals, assertThrows } from '@std/assert';

Deno.test('basic ecosystem tests for Deno', () => {
  const spark = new Spark({ env: 'test', tenant: 'my-tenant', token: 'open' });

  assertEquals(spark.config.baseUrl.full, 'https://excel.test.coherent.global/my-tenant');
  assertThrows(() => new Spark({ env: 'test', apiKey: 'some-key' }), SparkSdkError);
});
