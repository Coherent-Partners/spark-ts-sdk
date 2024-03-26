import { type Readable } from 'stream';
import { isBrowser, loadModule } from './utils';

export class Streamer {
  static fromBuffer(buffer: Buffer | ArrayBuffer): Readable {
    return isBrowser()
      ? new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array(buffer));
            controller.close();
          },
        })
      : loadModule('stream').Readable.from(Buffer.from(buffer));
  }
}
