import { Serializable } from '../data';
import { SparkApiError } from '../error';
import { HttpResponse, Multipart } from '../http';
import { StringUtils } from '../utils';

import { ApiResource, Uri, ApiResponse } from './base';

export class Folder extends ApiResource {
  /**
   * Create a new folder.
   * @param {string | CreateParams} params - Folder name and/or accompanying information
   * @returns {Promise<HttpResponse<FolderCreated>>}
   */
  async create(params: string | CreateParams): Promise<HttpResponse<FolderCreated>> {
    const url = Uri.from({}, { base: this.config.baseUrl.value, version: 'api/v1', endpoint: 'product/create' });
    const createParams = (StringUtils.isString(params) ? { name: params } : params) as CreateParams;
    const { name, category = 'Other', description, launchDate, startDate, status, cover } = createParams;
    const now = new Date();
    const launch = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());

    const multiparts: Multipart[] = [
      { name: 'Name', data: name },
      { name: 'Category', data: category },
      { name: 'Description', data: description ?? 'Created by Spark JS SDK' },
      { name: 'StartDate', data: startDate ?? now.toISOString() },
      { name: 'LaunchDate', data: launchDate ?? launch.toISOString() },
      { name: 'Status', data: status ?? 'Design' },
      ...(cover ? [{ name: 'CoverImage', data: Buffer.isBuffer(cover) ? cover.toString() : cover }] : []),
    ];

    return this.request<FolderCreated>(url.value, { method: 'POST', multiparts }).then((response) => {
      if (response.data.status === 'Success') return response;

      const cause = {
        request: { url: url.value, method: 'POST', headers: this.defaultHeaders, body: multiparts },
        response: { headers: response.headers, body: response.data, raw: Serializable.serialize(response.data) },
      };

      if (response.data.errorCode === 'PRODUCT_ALREADY_EXISTS') {
        throw SparkApiError.when(409, { message: `folder name <${name}> already exists`, cause });
      }
      throw SparkApiError.when(response.status, { message: `failed to create folder with name <${name}>`, cause });
    });
  }

  /**
   * Find folders by name, status, category, or favorite.
   * @param {string | SearchParams} params - Search parameters (name, status, category, favorite)
   * If `params` is a string, it will be used as the name to search for.
   * @param {Paging} paging - Paging options (page, size, sort)
   * @returns {Promise<HttpResponse<FolderListed>>}
   *
   * Note: `SearchParams.favorite` requires additional permissions if you're using API keys
   * for authentication.
   */
  find(params: string | SearchParams, paging: Paging = {}): Promise<HttpResponse<FolderListed>> {
    const url = Uri.from({}, { base: this.config.baseUrl.value, version: 'api/v1', endpoint: 'product/list' });
    const searchParams = (StringUtils.isString(params) ? { name: params } : params) as SearchParams;
    const search = Object.entries(searchParams)
      .filter(([, value]) => !!value)
      .map(([field, value]) => (field === 'favorite' ? { field: 'isstarred', value } : { field, value }));

    const body = {
      search,
      page: paging?.page ?? 1,
      pageSize: paging?.size ?? 100,
      sort: paging?.sort ?? '-updated',
      shouldFetchActiveServicesCount: true,
    };

    return this.request(url.value, { method: 'POST', body });
  }

  /**
   * Get the list of folder categories.
   * @returns {Promise<HttpResponse<FolderCategories>>}
   */
  getCategories(): Promise<HttpResponse<FolderCategories>> {
    const url = Uri.from({}, { base: this.config.baseUrl.value, version: 'api/v1', endpoint: 'lookup/getcategories' });
    return this.request(url.value);
  }

  /**
   * Update a folder's information.
   * @param {string} id - Folder ID
   * @param {CreateParams} params - Folder information to update
   * @returns {Promise<HttpResponse<FolderUpdated>>}
   */
  update(id: string, params: Omit<CreateParams, 'name' | 'cover' | 'status'>): Promise<HttpResponse<FolderUpdated>> {
    const url = Uri.from({}, { base: this.config.baseUrl.value, version: 'api/v1', endpoint: `product/update/${id}` });
    const body = { ...params, shouldTrackUserAction: true };

    return this.request(url.value, { method: 'POST', body });
  }

  /**
   * Delete a folder by ID.
   * @param {string} id - Folder ID
   * @returns {Promise<HttpResponse<FolderDeleted>>}
   */
  delete(id: string): Promise<HttpResponse<FolderDeleted>> {
    const url = Uri.from({}, { base: this.config.baseUrl.value, version: 'api/v1', endpoint: `product/delete/${id}` });
    return this.request(url.value, { method: 'DELETE' });
  }
}

export class File extends ApiResource {
  download(url: string): Promise<HttpResponse> {
    return this.request(url);
  }
}

type FolderCategory =
  | 'Medical'
  | 'Critical Illness'
  | 'Lifelong Participation'
  | 'Universal Life'
  | 'Investment Linked'
  | 'Annuity'
  | 'Term'
  | 'VHIS'
  | 'VHIS + Medical'
  | 'Property & Casualty'
  | 'Other';

interface CreateParams {
  name: string;
  description?: string;
  category?: FolderCategory;
  launchDate?: string;
  startDate?: string;
  status?: string;
  cover?: string | Buffer;
}

interface SearchParams {
  id?: string;
  name?: string;
  status?: string;
  category?: FolderCategory;
  favorite?: boolean;
}

interface Paging {
  page?: number;
  size?: number;
  sort?: string;
}

interface FolderApiResponse<T> extends Pick<ApiResponse, 'status'> {
  data: T;
  errorCode: string | null;
  message: string | null;
}

interface FolderInfo {
  id: string;
  name: string;
  status: string;
  category: FolderCategory;
  description: string;
  coverImagePath: string;
  createdAt: string;
  createdBy: string;
  lastModifiedDate: string;
  isStarred: boolean;
  kanbanStatus: string;
  startDate: string;
  launchDate: string;
  activeServiceCount: number;
  totalServiceCount: number;
}

type FolderCategories = FolderApiResponse<Array<{ key: FolderCategory; value: FolderCategory; icon: string }>>;

type FolderCreated = FolderApiResponse<{ folderId: string; get_product_url: string }>;

type FolderListed = FolderApiResponse<FolderInfo[]> & { count: number; next: number; previous: number };

type FolderUpdated = FolderApiResponse<null>;

type FolderDeleted = FolderApiResponse<null>;
