import { Logger, about } from '@cspark/sdk';

Logger.of({ context: `Browser`, timestamp: false }).log(about); // print to browser console

document.getElementById('spark').innerHTML = about; // print to browser page
