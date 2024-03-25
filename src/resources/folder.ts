import { HttpResponse, Multipart } from '../http';
import { StringUtils } from '../utils';

import { ApiResource, Uri } from './base';

export class Folder extends ApiResource {
  /**
   * Create a new folder.
   * @param {string | BodyParams} params - Folder name and/or accompanying information
   * @returns {Promise<HttpResponse>}
   */
  create(params: string | BodyParams): Promise<HttpResponse> {
    const url = Uri.from({}, { base: this.config.baseUrl.value, version: 'api/v1', endpoint: 'product/create' });
    const bodyParams = (StringUtils.isString(params) ? { name: params } : params) as BodyParams;
    const multiparts = parseBodyParams(bodyParams);

    return this.request(url.value, { method: 'POST', multiparts });
  }

  /**
   * Find folders by name, status, category, or favorite.
   * @param {string | SearchParams} params - Search parameters (name, status, category, favorite)
   * If `params` is a string, it will be used as the name to search for.
   * @param {Paging} paging - Paging options (page, pageSize, sort)
   * @returns {Promise<HttpResponse>}
   *
   * Note: `SearchParams.favorite` requires additional permissions if you're using API keys
   * for authentication.
   */
  find(params: string | SearchParams, paging: Paging = {}): Promise<HttpResponse> {
    const url = Uri.from({}, { base: this.config.baseUrl.value, version: 'api/v1', endpoint: 'product/list' });
    const searchParams = (StringUtils.isString(params) ? { name: params } : params) as SearchParams;
    const search = Object.entries(searchParams)
      .filter(([, value]) => !!value)
      .map(([field, value]) => (field === 'favorite' ? { field: 'isstarred', value } : { field, value }));

    const body = {
      search,
      page: paging?.page ?? 1,
      pageSize: paging?.pageSize ?? 100,
      sort: paging?.sort ?? '-updated',
      shouldFetchActiveServicesCount: true,
    };

    return this.request(url.value, { method: 'POST', body });
  }

  /**
   * Get the list of folder categories.
   * @returns {Promise<HttpResponse>}
   */
  getCategories(): Promise<HttpResponse> {
    const url = Uri.from({}, { base: this.config.baseUrl.value, version: 'api/v1', endpoint: 'lookup/getcategories' });
    return this.request(url.value);
  }

  /**
   * Update a folder's information.
   * @param {string} id - Folder ID
   * @param {BodyParams} params - Folder information to update
   * @returns {Promise<HttpResponse>}
   */
  update(id: string, params: Omit<BodyParams, 'name' | 'cover' | 'status'>): Promise<HttpResponse> {
    const url = Uri.from({}, { base: this.config.baseUrl.value, version: 'api/v1', endpoint: `product/update/${id}` });
    const body = { ...params, shouldTrackUserAction: true };

    return this.request(url.value, { method: 'POST', body });
  }

  /**
   * Delete a folder by ID.
   * @param {string} id - Folder ID
   * @returns {Promise<HttpResponse>}
   */
  delete(id: string): Promise<HttpResponse> {
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

interface BodyParams {
  name: string;
  description?: string;
  category?: FolderCategory;
  /**
   * Launch date of the folder in `YYYY-MM-DDTHH:MM:SS.SSSZ` format.
   */
  launchDate?: string;
  /**
   * Start date of the folder in `YYYY-MM-DDTHH:MM:SS.SSSZ` format.
   */
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
  pageSize?: number;
  sort?: string;
}

function parseBodyParams(data: BodyParams): Multipart[] {
  const { name, category = 'Other', description, launchDate, startDate, status, cover } = data;
  const now = new Date();
  const launch = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());

  return [
    { name: 'Name', data: name },
    { name: 'Category', data: category },
    { name: 'Description', data: description ?? 'Created by Spark JS SDK' },
    { name: 'StartDate', data: startDate ?? now.toISOString() },
    { name: 'LaunchDate', data: launchDate ?? launch.toISOString() },
    { name: 'Status', data: status ?? 'Design' },
    ...(cover ? [{ name: 'CoverImage', data: Buffer.isBuffer(cover) ? cover.toString() : cover }] : []),
  ];
}
