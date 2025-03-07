import { exp, imp, logger } from './index.js';

(async (args) => {
  if (args.length !== 4) {
    logger.error('Usage: node impex.js <FROM_SETTINGS> <FROM_TOKEN> <TO_SETTINGS> <TO_OAUTH>');
    process.exit(1);
  }

  const [FROM_SETTINGS, FROM_TOKEN, TO_SETTINGS, TO_CREDS] = args;

  try {
    const exported = await exp(FROM_SETTINGS, FROM_TOKEN);
    await imp(TO_SETTINGS, TO_CREDS, exported[0].buffer);
  } catch (error) {
    if (error instanceof Error) logger.error(error.message);
    else logger.critical(`Unknown error: ${error}`);
    process.exit(1);
  }
})(process.argv.slice(2));
