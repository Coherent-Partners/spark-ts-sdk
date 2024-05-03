import { type SparkClient } from '@cspark/sdk';

function create(spark: SparkClient) {
  spark.service.batch
    .create('my-folder/my-service')
    .then((resp) => console.log(JSON.stringify(resp.data, null, 2)))
    .catch(console.error);
}

async function createAndRun(spark: SparkClient) {
  function sleep(sec: number) {
    return new Promise((resolve) => setTimeout(resolve, sec * 1000));
  }

  function print(data: any) {
    console.log(JSON.stringify(data, undefined, 2));
  }

  const batch = await spark.batch.create({
    serviceUri: 'my-folder/my-service',
    subservices: ['my-subservice', 'my-other-subservice'],
  });

  const pipeline = spark.batch.of(batch.data.id);
  const submission = await pipeline.push(
    {
      chunks: [
        {
          id: 'uuid',
          data: {
            parameters: {},
            inputs: [
              /* json or columnar data */
            ],
          },
        },
      ],
    },
    { ifChunkIdDuplicated: 'replace' },
  );

  console.log(submission.data);
  await sleep(3);

  let status = await pipeline.getStatus();
  console.log(status.data);

  while (status.data.record_submitted < status.data.records_available) {
    status = await pipeline.getStatus();
    console.log(status.data);
    await sleep(5);
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
