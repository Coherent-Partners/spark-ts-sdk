import { Logger, about } from '@cspark/sdk';

Logger.of({ context: `Deno ${Deno.version.deno}`, timestamp: false }).log(about);
