import { HttpResponse } from '../http';
import { ApiResource, Uri, UriParams } from './base';

export class Wasm extends ApiResource {
  /**
   * Download a service's WebAssembly binary (WASM module).
   * @param {string | DownloadUriParams} uri - to locate service to download
   * @returns {Promise<HttpResponse>} - a buffer of the WASM module as a zip file
   *
   * FIXME: serviceUri made of folder and service fails to download.
   * Use serviceId or versionId instead.
   */
  download(uri: string | Omit<UriParams, 'proxy' | 'version'>): Promise<HttpResponse> {
    const { folder, service, public: isPublic, serviceId, versionId } = Uri.toParams(uri);
    let endpoint = 'getnodegenzipbyId/';
    if (folder && service) endpoint += `folders/${folder}/services/${service}`;
    else if (serviceId) endpoint += `service/${serviceId}`;
    else if (versionId) endpoint += `version/${versionId}`;
    const url = Uri.partial(`nodegen${isPublic ? '/public' : ''}`, { base: this.config.baseUrl.full, endpoint });

    return this.request(url.value);
  }
}
