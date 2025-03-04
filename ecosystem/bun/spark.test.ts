import Spark, { SparkSdkError } from '@cspark/sdk';
import { test, expect } from 'bun:test';

test('basic ecosystem tests for Bun', () => {
  const spark = new Spark({ env: 'test', tenant: 'my-tenant', token: 'open' });

  expect(spark.config.baseUrl.full).toBe('https://excel.test.coherent.global/my-tenant');
  expect(() => new Spark({ env: 'test', apiKey: 'some-key' })).toThrow(SparkSdkError);
});
