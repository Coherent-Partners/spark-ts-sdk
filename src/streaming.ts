import { type Readable } from 'stream';
import { isBrowser } from './utils';

export class Streamer {
  static fromBuffer(buffer: Buffer | ArrayBuffer): Readable {
    return isBrowser()
      ? new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array(buffer));
            controller.close();
          },
        })
      : eval('require')('stream').Readable.from(Buffer.from(buffer));
  }
}
