import { type SparkClient } from '../src';

function retrieveToken(spark: SparkClient) {
  spark.config.auth.oauth
    ?.retrieveToken(spark.config)
    .then(() => console.log(`access token: ${spark.config.auth.oauth?.accessToken}`))
    .catch(console.error);
}

export default {
  retrieveToken,
};
