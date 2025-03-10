import { Client as SparkClient } from './client';
import * as Errors from './error';

// Public API
export { version, about, Version, VERSION } from './version';
export { Authorization, OAuth } from './auth';
export { Serializable, JsonData } from './data';
export { BaseUrl, Config, JwtConfig } from './config';
export { HttpResponse, Multipart, Interceptor } from './http';
export { Uri, UriParams, ApiResource, createChunks } from './resources';
export { Logger, LoggerOptions, LogLevel, LoggerService } from './logger';
export { SparkApiError, SparkSdkError, SparkError } from './error';
export { ClientOptions as SparkOptions, Client as SparkClient } from './client';
export { Errors };

export default SparkClient;
