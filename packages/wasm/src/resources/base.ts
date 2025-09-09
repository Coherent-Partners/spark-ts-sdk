import { ApiResource } from '@cspark/sdk';

import { about } from '../version';

export abstract class HybridResource extends ApiResource {
  override get defaultHeaders(): Record<string, string> {
    return {
      ...super.defaultHeaders,
      'User-Agent': about,
    };
  }
}
