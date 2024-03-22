// Public API
export { version } from './version';
export { Authorization } from './auth';
export { SparkApiError, SparkSdkError, SparkError } from './error';
export { type ClientOptions as SparkOptions, Client as SparkClient } from './client';
import { Client } from './client';
export default Client;
