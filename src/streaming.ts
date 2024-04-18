import { type Readable } from 'stream';
import { Buffer } from 'buffer';
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

  static fromBase64(data: string): Readable {
    return isBrowser()
      ? new ReadableStream<Uint8Array>({
          start(controller) {
            const decoded = atob(data);
            const array = new Uint8Array(new ArrayBuffer(decoded.length));
            for (let i = 0; i < decoded.length; i++) array[i] = decoded.charCodeAt(i);

            controller.enqueue(array);
            controller.close();
          },
        })
      : loadModule('stream').Readable.from(Buffer.from(data, 'base64'));
  }

  static async toBuffer(bytes: Readable): Promise<Buffer> {
    const buffers: Buffer[] = [];
    for await (const data of bytes) {
      buffers.push(data);
    }
    return Buffer.concat(buffers);
  }
}
