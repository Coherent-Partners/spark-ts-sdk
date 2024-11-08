import { type Readable } from 'stream';
import { type Config } from '../config';

import { UriParams } from './base';
import { ImportDestination } from './impex';

export type UpgradeType = 'major' | 'minor' | 'patch';

export type ExportFilters = { file?: 'migrate' | 'onpremises'; version?: 'latest' | 'all' };

export type IfEntityPresent = 'abort' | 'replace' | 'add_version';

export interface GetVersionsParams extends Pick<UriParams, 'folder' | 'service'> {}

export interface GetSchemaParams extends Pick<UriParams, 'folder' | 'service' | 'versionId'> {}

export interface GetMetadataParams extends Omit<UriParams, 'version'> {}

export interface GetSwaggerParams extends Pick<UriParams, 'folder' | 'service' | 'versionId'> {
  subservice?: string;
  downloadable?: boolean;
}

export interface DownloadParams extends Pick<UriParams, 'folder' | 'service' | 'version'> {
  fileName?: string;
  type?: 'original' | 'configured';
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
