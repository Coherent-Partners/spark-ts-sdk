import { type SparkClient } from '../src';

function create(spark: SparkClient) {
  spark.batches
    .create('my-folder/my-service')
    .then((resp) => console.log(JSON.stringify(resp.data, undefined, 2)))
    .catch(console.error);
}

async function createAndRun(spark: SparkClient) {
  function sleep(sec: number) {
    return new Promise((resolve) => setTimeout(resolve, sec * 1000));
  }

  function print(data: any) {
    console.log(JSON.stringify(data, undefined, 2));
  }

  const batch = await spark.batches.create({
    serviceUri: 'my-folder/my-service',
    subservices: ['my-subservice', 'my-other-subservice'],
  });

  const pipeline = spark.batches.of(batch.data.id);
  const submission = await pipeline.push({
    inputs: [
      /* json or columnar data */
    ],
  });

  console.log(submission.data);
  await sleep(2);

  let status = await pipeline.getStatus();
  console.log(status.data);

  while (status.data.records_available < status.data.record_submitted) {
    status = await pipeline.getStatus();
    console.log(status.data);
    await sleep(3);
  }

  const result = await pipeline.pull();
  print(result.data);

  const state = await pipeline.close();
  print(state.data);
}

export default {
  create,
  createAndRun,
};
