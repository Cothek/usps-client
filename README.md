
# USPS Standalone Client

A modular, side-effect-free library for interacting with the USPS APIs (OAuth2, Address Validation, Rate Calculation, and Label Generation).

## Features
- **OAuth2**: Handles token lifecycle.
- **Address**: DPV validation and cleansing.
- **Rates**: Commercial base rate search with support for custom service filtering.
- **Labels**: PDF label generation with automatic cropping to 4x6 format.

## Dependencies
- `pdf-lib`: Required for label cropping and processing.
- `zod`: Required for schema validation (if used in consumer).

## Usage
Initialize the client by passing configuration directly to the functional modules.

```typescript
import { createLabel, getUspsAccessToken } from './usps-client';

const token = await getUspsAccessToken({
  consumerKey: '...',
  consumerSecret: '...',
  isProduction: false
});

const label = await createLabel({
  accessToken: token,
  isProduction: false,
  config: { ... }
});
```
