# USPS Standalone Client

A modular, side-effect-free library for interacting with the USPS APIs (OAuth2, Address Validation, Rate Calculation, and Label Generation).

## Features
- **OAuth2**: Handles token lifecycle.
- **Address**: DPV validation and cleansing.
- **Rates**: Commercial base rate search with support for custom service filtering.
- **Labels**: PDF label generation with automatic cropping to 4x6 format.

## Dependencies
- `pdf-lib`: Required for label cropping and processing.
- `zod`: Required for schema validation.

## Required Environment Variables

To use this library effectively within an application, you should define the following variables in your `.env` file and pass them to the library functions:

### API Credentials
- `USPS_CONSUMER_KEY`: Your USPS API Consumer Key.
- `USPS_CONSUMER_SECRET`: Your USPS API Consumer Secret.
- `NEXT_PUBLIC_APP_ENV`: Set to `production` to target live APIs, otherwise targets the TEM (Test) environment.

### Label Generation (Payment & Identity)
- `USPS_MID_NUMBER`: Your USPS Mailer ID.
- `USPS_CRID_NUMBER`: Your USPS Customer Registration ID.
- `USPS_EPS_ACCOUNT_NUMBER`: Your USPS Enterprise Payment System account number.

### Origin Address (Sender)
- `USPS_FROM_NAME`: Sender name/Firm name.
- `USPS_FROM_ADDRESS1`: Street address.
- `USPS_FROM_CITY`: City.
- `USPS_FROM_STATE`: State (2-letter code).
- `USPS_FROM_ZIP5`: 5-digit ZIP code.

## Usage

### 1. Authentication
```typescript
import { getUspsAccessToken } from 'usps-client';

const token = await getUspsAccessToken({
  consumerKey: process.env.USPS_CONSUMER_KEY,
  consumerSecret: process.env.USPS_CONSUMER_SECRET,
  isProduction: process.env.NEXT_PUBLIC_APP_ENV === 'production'
});
```

### 2. Label Creation
```typescript
import { createLabel } from 'usps-client';

const label = await createLabel({
  accessToken: '...',
  isProduction: false,
  config: {
    mid: process.env.USPS_MID_NUMBER,
    crid: process.env.USPS_CRID_NUMBER,
    epsAccountNumber: process.env.USPS_EPS_ACCOUNT_NUMBER,
    fromAddress: { ... },
    toAddress: { ... },
    packageDetails: { ... }
  }
});
```

## License
MIT