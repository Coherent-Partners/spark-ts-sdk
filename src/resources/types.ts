import { type Readable } from 'stream';
import { type Config } from '../config';

import { UriParams } from './base';
import { ImportDestination } from './impex';

export type UpgradeType = 'major' | 'minor' | 'patch';

export type EncodingType = 'gzip' | 'deflate';

export type CompilerType = 'Neuron' | 'Type3' | 'Type2' | 'Type1' | 'Xconnector';

export type ValidationType = 'static' | 'dynamic';

export type JsonInputs = Record<string, any>;

export type ArrayInputs<T = any> = T[];

export type Inputs<T> = undefined | null | string | JsonInputs | ArrayInputs<T>;

export type ExportFilters = { file?: 'migrate' | 'onpremises'; version?: 'latest' | 'all' };

export type IfEntityPresent = 'abort' | 'replace' | 'add_version';

// eslint-disable-next-line
export interface GetVersionsParams extends Pick<UriParams, 'folder' | 'service'> {}

// eslint-disable-next-line
export interface GetSchemaParams extends Pick<UriParams, 'folder' | 'service' | 'versionId'> {}

// eslint-disable-next-line
export interface GetMetadataParams extends Omit<UriParams, 'version' | 'proxy'> {}

export interface GetSwaggerParams extends Pick<UriParams, 'folder' | 'service' | 'versionId'> {
  subservice?: string;
  downloadable?: boolean;
}

export interface DownloadParams extends Pick<UriParams, 'folder' | 'service' | 'versionId'> {
  fileName?: string;
  type?: 'original' | 'configured';
}

export interface SearchParams {
  page?: number;
  limit?: number;
  sort?: string;
  query?: any[];
  fields?: string[];
}

export interface RecompileParams extends Pick<UriParams, 'folder' | 'service' | 'versionId'> {
  upgrade?: UpgradeType;
  compiler?: string;
  releaseNotes?: string;
  label?: string;
  startDate?: number | string | Date;
  endDate?: number | string | Date;
  tags?: string | string[];
}

export interface ConfigParams {
  /** Defaults to `Config.maxRetries` */
  maxRetries?: number;
  /** Defaults to `Config.retryInterval` */
  retryInterval?: number;
}

export interface CreateParams extends CompileParams, ConfigParams {
  draftName?: string;
  trackUser?: boolean;
}

export interface CompileParams extends Pick<UriParams, 'folder' | 'service'> {
  folder: string;
  service: string;
  file: Readable;
  fileName?: string;
  versioning?: UpgradeType;
  startDate?: string | number | Date;
  endDate?: string | number | Date;
}

export interface GetStatusParams extends Pick<UriParams, 'folder' | 'service'>, ConfigParams {
  folder: string;
  service: string;
  jobId: string;
}

export interface PublishParams extends Pick<UriParams, 'folder' | 'service'> {
  folder: string;
  service: string;
  fileId: string;
  engineId: string;
  draftName?: string;
  versioning?: UpgradeType;
  startDate?: string | number | Date;
  endDate?: string | number | Date;
  trackUser?: boolean;
}

export interface ExecuteParams<I = Record<string, any>> {
  // Data for calculation
  inputs?: Inputs<I>;
  responseFormat?: 'original' | 'alike';
  encoding?: EncodingType;

  // Metadata for calculation
  activeSince?: string | number | Date;
  sourceSystem?: string;
  correlationId?: string;
  callPurpose?: string;
  compilerType?: CompilerType;
  subservices?: undefined | string | string[];

  // Available only in v3 (legacy)
  debugSolve?: boolean;
  downloadable?: boolean;
  echoInputs?: boolean;
  selectedOutputs?: undefined | string | string[];
  tablesAsArray?: undefined | string | string[];
  outputsFilter?: string;

  // Extra metadata if needed
  extras?: Record<string, any>;
}

export interface ValidateParams extends ExecuteParams {
  validationType?: ValidationType;
}

export interface TransformParams extends Omit<ExecuteParams, 'inputs'> {
  inputs: any; // override the inputs type
  apiVersion?: 'v3' | 'v4';
  encoding?: EncodingType;
  using?: string | { name: string; folder: string };
}

export interface ExportParams extends Pick<UriParams, 'folder' | 'service' | 'version' | 'versionId'>, ConfigParams {
  serviceUri?: string;
  filters?: ExportFilters;
  sourceSystem?: string;
  correlationId?: string;
}

export interface ImportParams extends ConfigParams {
  file: Readable;
  destination: ImportDestination;
  config?: Config;
  ifPresent?: IfEntityPresent;
  sourceSystem?: string;
  correlationId?: string;
}

export interface MigrateParams extends ConfigParams {
  destination: ImportDestination;
  config: Config;
  filters?: ExportFilters;
  ifPresent?: IfEntityPresent;
  sourceSystem?: string;
  correlationId?: string;
}
