const { Logger, about } = require('@cspark/sdk');

Logger.of({ context: `Node.js CJS`, timestamp: false }).log(about);
