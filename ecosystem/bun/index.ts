import { Logger, about } from '@cspark/sdk';

Logger.of({ context: `Bun ${Bun.version}`, timestamp: false }).log(about);
