import { createWriteStream } from 'fs';
import { SparkClient, Logger } from '@cspark/sdk';

const FROM_SPARK_SETTINGS =
  '{"env":"uat.us","tenant":"my-tenant","timeout":90000,"max_retries":20,"retry_interval":3,"services":["source-folder/my-service"]}';
const FROM_BEARER_TOKEN = 'uat bearer token';
const TO_SPARK_SETTINGS =
  '{"env":"us","tenant":"my-tenant","timeout":90000,"max_retries":40,"retry_interval":3,"services":{"source":"source-folder/my-service","target":"target-folder/my-service"}}';
const TO_OAUTH_CREDS = '{"client_id":"my-client-id","client_secret":"my-client-secret"}';

const CICD_HANDLER = 'CI'; // GitHub Actions, Jenkins, etc.
const FILE_PATH = 'package.zip';

// ---------------- You do NOT need to modify below this line ----------------
export const logger = Logger.of({ logLevels: ['verbose'] });

export async function exp(settings, auth) {
  const { services, ...options } = JSON.parse(settings);
  const spark = new SparkClient({ ...options, token: auth });
  const downloadables = await spark.impex.export({ services, sourceSystem: CICD_HANDLER });

  if (downloadables.length === 0) throw 'no files to download';
  logger.verbose(`✅ ${downloadables.length} service(s) exported`);

  return downloadables;
}

export async function imp(settings, auth, file) {
  const { services: destination, ...options } = JSON.parse(settings);
  const spark = new SparkClient({ ...options, oauth: JSON.parse(auth) });
  await spark.config.auth.oauth?.retrieveToken(spark.config);

  const imported = await spark.impex.import({ file, destination, ifPresent: 'add_version' });
  if (!imported.data.outputs || imported.data.outputs.services.length === 0) throw 'no services imported';
  logger.verbose(`✅ ${outputs.services.length} service(s) imported`);

  return imported;
}

async function main() {
  const file = createWriteStream(FILE_PATH);

  try {
    const exported = await exp(FROM_SPARK_SETTINGS, FROM_BEARER_TOKEN);
    exported[0].buffer.pipe(file);
    logger.verbose(`🎉 exported service(s) downloaded successfully as ${FILE_PATH}`);

    await imp(TO_SPARK_SETTINGS, TO_OAUTH_CREDS, file);
  } catch (error) {
    if (error instanceof Error) logger.error(error.message);
    else logger.fatal(`Unknown error: ${error}`);
  } finally {
    file.close();
  }
}

main();
