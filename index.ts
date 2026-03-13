/**
 * @fileOverview Root entry point for the USPS client library.
 * This file ensures stable imports for package consumers.
 */

import USPSClient from './src/lib/usps/USPSClient.js';

export default USPSClient;
export * from './src/lib/usps/constants.js';
export * from './src/lib/usps/types.js';
export * from './src/lib/usps/schemas.js';
