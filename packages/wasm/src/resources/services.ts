import { type Readable } from 'stream';
import { Uri, UriParams, HttpResponse, SparkClient } from '@cspark/sdk';
import { HybridResource } from './base';

export class Services extends HybridResource {
  /**
   * upload a WASM package to a running Hybrid Runner.
   *
   * @param {Readable} file including wasm and other assets
   * @param {string} fileName of the zip file
   * @returns {Promise<HttpResponse<ServiceUploaded>>} the uploaded service details.
   *
   * The zip file should contain the compiled wasm file and other assets needed
   * to run the service. This package refers to the zip file exported from the
   * SaaS using `onpremises` mode via Export API.
   * @see https://docs.coherent.global/spark-apis/impex-apis/export for more details.
   */
  upload(file: Readable, fileName: string = 'package.zip'): Promise<HttpResponse<ServiceUploaded>> {
    const url = Uri.from(undefined, { base: this.config.baseUrl.value, endpoint: 'upload' });
    return this.request<ServiceUploaded>(url, {
      method: 'POST',
      multiparts: [{ name: 'file', fileStream: file, fileName, contentType: 'application/zip' }],
    });
  }

  /**
   * Executes a WASM service.
   *
   * @param {string | UriParams} uri - use the `{folder}/{service}[?{version}]`,
   * `service/{serviceId}`, `version/{versionId}` format to locate the service;
   * or use fine-grained details to locate the service. The `UriParams` object
   * can be used to specify the service location and additional parameters like
   * the version ID, service ID, etc.
   * @param {ExecuteParams<Input>} [params] - the optional execution parameters (inputs, metadata, etc.)
   * The inputs can be provided the following ways:
   * - as `null` or `undefined` to use the default inputs
   * - as a JSON string
   * - as a JSON object for single inputs execution
   * - as an array of JSON objects for synchronous batch execution
   * @returns {Promise<HttpResponse<ServiceExecuted<Output>>>} the service execution response
   *
   * Obviously, the SDK ignores what those default values are. Under the hood,
   * the SDK uses an empty object `{}` as the input data, which is an indicator for
   * the runner to use the default inputs defined in the Excel file.
   */
  async execute<Input, Output>(
    uri: string | UriParams,
    params: ExecuteParams<Input> = {},
  ): Promise<HttpResponse<ServiceExecuted<Output>>> {
    return await new SparkClient(this.config).services.execute(uri, params);
  }

  /**
   * Validates the inputs for a service.
   * @param {ServiceIdentifier} uri - how to locate the service
   * @param {ValidateParams} params - optionally the validation parameters (inputs, metadata, etc.)
   */
  validate(uri: ServiceIdentifier, params?: ValidateParams): Promise<HttpResponse<ServiceValidated>> {
    const { serviceId, versionId } = Uri.validate(uri);
    const { inputs, validationType, metadata = {} } = params ?? {};
    const url = this.config.baseUrl.concat({ endpoint: 'validation' });
    const body = {
      request_data: { inputs },
      request_meta: {
        ...metadata,
        service_id: serviceId,
        version_id: versionId,
        validation_type: validationType === 'dynamic' ? 'dynamic' : 'default_values',
      },
    };

    return this.request<ServiceValidated>(url, { method: 'POST', body });
  }

  /**
   * Gets the metadata of a WASM service.
   * @param {ServiceIdentifier} uri - how to locate the service
   */
  async getMetadata(uri: ServiceIdentifier, params?: GetMetadataParams): Promise<HttpResponse<ServiceExecuted>> {
    const { serviceId, versionId } = Uri.validate(uri);
    const { inputs, metadata = {} } = params ?? {};
    const url = this.config.baseUrl.concat({ endpoint: 'metadata' });
    const body = {
      request_data: { inputs },
      request_meta: { ...metadata, service_id: serviceId, version_id: versionId },
    };

    return this.request(url, { method: 'POST', body });
  }
}

type JsonInputs = Record<string, any>;
type ArrayInputs<T = any> = T[];
type Inputs<T> = undefined | null | string | JsonInputs | ArrayInputs<T>;
type ServiceIdentifier = string | Pick<UriParams, 'serviceId' | 'versionId'>;

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

interface ValidateParams<I = Record<string, any>> {
  inputs?: Inputs<I>;
  metadata?: Record<string, any>;
  validationType?: 'dynamic' | 'static';
}

interface GetMetadataParams<I = Record<string, any>> {
  inputs?: Inputs<I>;
  metadata?: Record<string, any>;
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

type ServiceValidated = {
  response_data: {
    outputs: Record<string, any>;
    [key: string]: any;
  };
  response_meta: {
    version_id: string;
    allow_range_address: boolean;
    validation_type: string;
    compiler_type: string;
    system: string;
    compiler_version: string;
    process_time: number;
    [key: string]: any;
  };
};
