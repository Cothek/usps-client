/**
 * @fileOverview Entry point for the standalone USPS client library.
 * Proxies to the source directory for consistency.
 */

import USPSClient from './src/lib/usps/USPSClient.js';

export default USPSClient;

export * from './src/lib/usps/constants.js';
export * from './src/lib/usps/types.js';
export * from './src/lib/usps/schemas.js';
