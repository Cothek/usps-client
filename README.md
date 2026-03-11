# USPS Standalone Client

A modular, side-effect-free library for interacting with the USPS APIs (OAuth2, Address Validation, Rate Calculation, and Label Generation).

## Installation in Other Projects

You can use this library in other projects by adding it to your `package.json`.

### Option A: Local File (Fastest for local dev)

If the library lives on the same machine as your other project:

```bash
npm install file:../path-to-this-folder/src/lib/usps-client
```

### Option B: GitHub Repository (Recommended for Cloud/Teams)

If your environment does not have SSH configured (common in cloud IDEs), use the **HTTPS** or **shortcut** syntax:

```bash
# Using the shortcut (most compatible)
npm install github:YOUR_USERNAME/usps-client

# OR using the full HTTPS URL
npm install https://github.com/YOUR_USERNAME/usps-client.git
```

### Peer Dependencies

Ensure your target project has the required peer dependencies installed:

```bash
npm install pdf-lib zod
```

## Features

- **OAuth2**: Handles token lifecycle.
- **Address**: DPV validation and cleansing.
- **Rates**: Commercial base rate search with support for custom service filtering.
- **Labels**: PDF label generation with automatic cropping to 4x6 format.

## Required Environment Variables

To use this library effectively, define the following variables in your `.env` file:

### API Credentials

- `USPS_CONSUMER_KEY`: Your USPS API Consumer Key.
- `USPS_CONSUMER_SECRET`: Your USPS API Consumer Secret.
- `NEXT_PUBLIC_APP_ENV`: Set to `production` to target live APIs, otherwise targets TEM (Test).

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

## Usage Example

### 1. Authentication

```typescript
import { getUspsAccessToken } from "usps-client";

const token = await getUspsAccessToken({
  consumerKey: process.env.USPS_CONSUMER_KEY,
  consumerSecret: process.env.USPS_CONSUMER_SECRET,
  isProduction: process.env.NEXT_PUBLIC_APP_ENV === "production",
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
