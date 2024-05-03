// Public API
export { version, about } from './version';
export { Authorization } from './auth';
export { Uri, UriParams, ApiResource } from './resources';
export { Logger, LoggerOptions, LogLevel, LoggerService } from './logger';
export { SparkApiError, SparkSdkError, SparkError } from './error';
export { ClientOptions as SparkOptions, Client as SparkClient } from './client';
import { Client as SparkClient } from './client';
export default SparkClient;
