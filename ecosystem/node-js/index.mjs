import { Logger, about } from '@cspark/sdk';

Logger.of({ context: `Node.js ESM ${process.versions.node}`, timestamp: false }).log(about);
