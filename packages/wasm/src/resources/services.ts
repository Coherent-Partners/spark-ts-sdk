import { type Readable } from 'stream';
import { ApiResource, Uri, UriParams, HttpResponse, SparkClient } from '@cspark/sdk';

export class Services extends ApiResource {
  upload(file: Readable, fileName: string = 'package.zip'): Promise<HttpResponse<ServiceUploaded>> {
    const url = Uri.from(undefined, { base: this.config.baseUrl.value, endpoint: 'upload' });
    return this.request<ServiceUploaded>(url, {
      method: 'POST',
      multiparts: [{ name: 'file', fileStream: file, fileName, contentType: 'application/zip' }],
    });
  }

  async execute<Input, Output>(
    uri: string | UriParams,
    params: ExecuteParams<Input> = {},
  ): Promise<HttpResponse<ServiceExecuted<Output>>> {
    return new SparkClient(this.config).services.execute(uri, params);
  }
}

export class Version extends ApiResource {
  get() {
    return this.request(`${this.config.baseUrl.value}/version`);
  }
}

export class Health extends ApiResource {
  check() {
    return this.request(`${this.config.baseUrl.value}/healthcheck`);
  }
}

type JsonInputs = Record<string, any>;
type ArrayInputs<T = any> = T[];
type Inputs<T> = undefined | null | string | JsonInputs | ArrayInputs<T>;

interface ExecuteParams<I = Record<string, any>> {
  // Data for calculation
  inputs?: Inputs<I>;
  responseFormat?: 'original' | 'alike';
  encoding?: 'gzip' | 'deflate';

  // Metadata for calculation
  activeSince?: string | number | Date;
  sourceSystem?: string;
  correlationId?: string;
  callPurpose?: string;
  subservices?: undefined | string | string[];

  // Available only in v3 (legacy)
  debugSolve?: boolean;
  echoInputs?: boolean;
  selectedOutputs?: undefined | string | string[];
  tablesAsArray?: undefined | string | string[];
  outputsFilter?: string;
}

type ServiceUploaded = {
  response_data: {
    tenant: string;
    services: {
      EffectiveStartDate: string;
      EffectiveEndDate: string;
      EngineInformation: {
        FileSize: number;
        Author: string;
        ProductName: string;
        Revision: string;
        Description: string | null;
        FileMD5Hash: string;
        UniversalFileHash: string | null;
        ReleaseDate: string;
        ServiceName: string;
        NoOfInstance: number;
        UploaderEmail: string;
        DefaultEngineType: string;
        OriginalFileName: string;
        SizeOfUploadedFile: number;
        ReleaseNote: string | null;
        IsTypeScriptFile: boolean;
        EngineUpgradeType: string;
        PublicAPI: boolean;
        FileGuid: string;
        ServiceGuid: string;
        ServiceVersionGuid: string;
        BaseUrl: string;
        Tenant: string;
        AllowToStoreHistory: boolean;
        CalcMode: string;
        ForceInputsWriteBeforeCalcModeChanges: boolean;
        Provenance: string | null;
        VersionLabel: string | null;
        ExplainerType: string;
        IsXParameter: boolean;
        ParametersetCompatibilityGroup: string;
        XParameterSetVersionId: string;
        VersionUpgradeAssert: string;
        XReportRanges: string | null;
        Tags: string | null;
        OriginalServiceHash: string;
        CompiledOutputHash: string;
        CompilerVersion: string;
        CompilerVersionServiceUpdate: string;
        DirectAddressingOutputsEnabled: boolean;
      };
      XInputTable: {
        'Input Name': string;
        Description: string | null;
        Address: string;
      }[];
      XOutputTable: {
        'Output Name': string;
        Description: string | null;
        Address: string;
      }[];
      VersionId: string;
      HasSignatureChain: string | null;
    }[];
  }[];
};

type ServiceExecuted<Output = Record<string, any>> = {
  outputs: Output[];
  process_time: number[];
  warnings: Partial<{ source_path: string; message: string }>[];
  errors: Partial<{
    error_category: string;
    error_type: string;
    additional_details: string;
    source_path: string;
    message: string;
  }>[];
  service_chain?: Partial<{
    service_name: string;
    run_if: string;
    requested_report: string;
    requested_report_filename: string;
  }>[];
  service_id: string;
  version_id: string;
  version: string;
  call_id: string;
  compiler_version: string;
  correlation_id: string;
  request_timestamp: string;
};
