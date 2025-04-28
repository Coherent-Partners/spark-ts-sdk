import Validators from '../validators';
import { StringUtils } from '../utils';
import { HttpResponse } from '../http';
import { Services } from './services';
import { ApiResource, UriParams } from './base';
import { TransformParams as ExecuteParams } from './types';

export class Transforms extends ApiResource {
  readonly #version: string = 'api/v4';

  /**
   * Lists all transform documents in a folder in a paginated manner.
   *
   * @param {string} folder - to list transform documents from.
   * @param {Paging} params - for listing transform documents.
   * @returns {Promise<HttpResponse<TransformListed>>}
   */
  list(folder: string, params: Paging = {}): Promise<HttpResponse<TransformListed>> {
    const { page = 1, size: pageSize = 100, sort = '-updatedAt', search = [] } = params;
    const url = this.config.baseUrl.concat({ version: this.#version, endpoint: `transforms/list/${folder}` });

    return this.request(url, { method: 'POST', body: { page, pageSize, sort, search } });
  }

  /**
   * Validates a transform document.
   *
   * @param {string} transform - document to validate.
   * @returns {Promise<HttpResponse<DocumentValidated>>}
   */
  validate(transform: string | Transform): Promise<HttpResponse<DocumentValidated>> {
    const url = this.config.baseUrl.concat({ version: this.#version, endpoint: 'transforms/validation' });
    return this.request(url, { method: 'POST', body: { transform_content: this.#build(transform) } });
  }

  /**
   * Creates or updates a transform document.
   *
   * @param {SaveParams} params - for saving a transform document.
   * @returns {Promise<HttpResponse<DocumentSaved>>}
   */
  save(params: SaveParams): Promise<HttpResponse<DocumentSaved>> {
    const { name, folder, transform } = params;
    const endpoint = `transforms/${folder}/${name}`;
    const url = this.config.baseUrl.concat({ version: this.#version, endpoint });

    return this.request(url, { method: 'POST', body: { transform_content: this.#build(transform) } });
  }

  /**
   * Retrieves a transform document.
   *
   * @param {string | TransformParams} uri - of the transform document.
   * @returns {Promise<HttpResponse<DocumentFound>>}
   */
  get(uri: string | TransformParams): Promise<HttpResponse<DocumentFound>> {
    uri = StringUtils.isString(uri) ? uri : uri?.folder?.concat('/', uri.name);
    const url = this.config.baseUrl.concat({ version: this.#version, endpoint: `transforms/${uri}` });

    return this.request(url, { method: 'GET' });
  }

  /**
   * Executes a service using transforms.
   * @see {@link Services.transform} for more details as this is an alias for it.
   */
  execute<Output>(uri: string | UriParams, params: ExecuteParams): Promise<HttpResponse<Output>> {
    return new Services(this.config).transform(uri, params);
  }

  /**
   * Deletes a transform document.
   *
   * @param {string | TransformParams} uri - of the transform document.
   * @returns {Promise<HttpResponse<DocumentDeleted>>}
   */
  delete(uri: string | TransformParams): Promise<HttpResponse<DocumentDeleted>> {
    uri = StringUtils.isString(uri) ? uri : uri?.folder?.concat('/', uri.name);
    const url = this.config.baseUrl.concat({ version: this.#version, endpoint: `transforms/${uri}` });

    return this.request(url, { method: 'DELETE' });
  }

  #build(value: string | Transform): string {
    value = (StringUtils.isString(value) ? JSON.parse(value) : value) as Transform;

    const transform = JSON.stringify({
      transform_type: value?.schema ?? 'JSONtransforms_v1.0.1',
      target_api_version: value?.apiVersion ?? 'v3',
      input_body_transform: value?.inputs ?? null,
      output_body_transform: value?.outputs ?? null,
    });

    Validators.transform.getInstance().validate(transform);
    return transform;
  }
}

interface Paging {
  page?: number;
  size?: number;
  sort?: string;
  search?: Array<{ field: string; value: string }>;
}

interface Transform {
  schema?: string;
  apiVersion?: 'v3' | 'v4';
  inputs?: string;
  outputs?: string;
}

interface TransformParams {
  name: string;
  folder: string;
}

interface SaveParams extends TransformParams {
  transform: string | Transform;
}

type TransformListed = {
  count: number;
  page: number;
  pageSize: number;
  result: Array<{
    id: string;
    name: string;
    transform_type: string;
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    modifiedBy: string;
  }>;
};

type TransformDocument<T> = {
  object: string;
  response_timestamp: string;
  process_time: number;
  id: string;
  status: string;
  outputs: T;
};

type DocumentValidated = TransformDocument<{
  isValid: boolean;
  error: null | Array<{
    code: string;
    type: string;
    message: string;
  }>;
}>;

type DocumentSaved = TransformDocument<{
  name: string;
  transform_uri: string;
}>;

type DocumentFound = TransformDocument<{
  transform_document: string;
  updatedAt: string;
}>;

type DocumentDeleted = TransformDocument<{
  name: string;
  transform_uri: string;
}>;
