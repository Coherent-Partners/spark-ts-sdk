import { SparkClient, SparkSdkError } from '@cspark/sdk';

test();

async function test(description = 'All tests passed') {
  const result = {};

  try {
    const spark = new SparkClient({ env: 'test', tenant: 'my-tenant', token: 'open' });
    expect(spark.config.baseUrl.full).toBe('https://excel.test.coherent.global/my-tenant');
    expect(spark.config.allowBrowser).toBe(true);
    expect(() => new SparkClient({ env: 'test', apiKey: 'some-key' })).toThrow(SparkSdkError);

    result.passed = true;
    result.details = description;
  } catch (error) {
    result.passed = false;
    result.details = String(error);
  }

  // Write results to the page
  const pre = document.createElement('pre');
  pre.id = 'results';
  pre.innerText = JSON.stringify(result, undefined, 2);
  document.body.appendChild(pre);

  document.getElementById('spark-browser-test').innerText = 'Done!';
  console.log(description);
}

// A simple assertion helper
function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        console.error(`actual  : ${actual}`);
        console.error(`expected: ${expected}`);
        throw new Error(`Expected ${actual} to equal ${expected}`);
      }
    },
    toThrow(expected) {
      try {
        actual();
        throw new Error(`Expected ${actual} to throw`);
      } catch (error) {
        if (error instanceof expected) return;
        console.error(`actual  : <not thrown>`);
        console.error(`expected: ${expected.name}`);
        throw new Error(`failed to throw ${expected.name}`);
      }
    },
  };
}
