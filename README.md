# USPS Standalone Client

A modular, robust TypeScript library for interacting with the USPS v3 APIs (OAuth2, Address Validation, Rate Calculation, and Label Generation).

This library is hardened with **Zod validation and coercion**, ensuring that inputs from web forms (which often arrive as strings) are safely transformed into the precise numeric types required by the USPS OpenAPI specifications.

## Installation

This library is designed to be installed directly from GitHub. Ensure you have `pdf-lib` and `zod` installed in your project as they are required peer dependencies.

```bash
# 1. Install peer dependencies
npm install pdf-lib zod

# 2. Install the client
npm install github:Cothek/usps-client
```

## Configuration

Initialize the `USPSClient` with your API credentials. Account-level credentials (`mid`, `crid`, `epsAccountNumber`) are provided once at initialization. This allows you to use `getRates` or `validateAddress` without needing full shipping credentials.

```typescript
import USPSClient from 'usps-client';

const uspsClient = new USPSClient({
  consumerKey: process.env.USPS_CONSUMER_KEY!,
  consumerSecret: process.env.USPS_CONSUMER_SECRET!,
  env: process.env.USPS_ENV === 'production' ? 'production' : 'development',
  originZipCode: process.env.USPS_ORIGIN_ZIP_CODE!,
  
  // Optional: Only required if you intend to generate shipping labels
  mid: process.env.USPS_MID,
  crid: process.env.USPS_CRID,
  epsAccountNumber: process.env.USPS_EPS_ACCOUNT,
});
```

## Usage

### 1. Create a Shipping Label

Generates a print-ready 4x6 label. Address information requires either `firstName` and `lastName`, or a `firm` name.

```typescript
try {
  const label = await uspsClient.createLabel({
    fromAddress: {
      firstName: 'John',
      lastName: 'Doe',
      streetAddress: '123 Main St',
      city: 'Anytown',
      state: 'NY',
      zipCode: '10001',
    },
    toAddress: {
      firm: 'ACME Corp',
      streetAddress: '456 Side St',
      city: 'Othertown',
      state: 'CA',
      zipCode: '90210',
    },
    packageDetails: {
      contentType: 'MERCHANDISE',
      contentDescription: 'Books',
      mailClass: 'PM', // Priority Mail
      processingCategory: 'MACHINABLE',
      weight: 2.5,
      length: 12,
      width: 9,
      height: 6,
      mailingDate: '2025-03-12', // YYYY-MM-DD
    },
  });

  console.log('Tracking Number:', label.trackingNumber);
} catch (error) {
  console.error('Label Error:', error.message);
}
```

### 2. Get Shipping Rates

```typescript
const rates = await uspsClient.getRates({
  destinationZipCode: '90210',
  weightLbs: "1.5", // Automatically coerced from string
  weightOz: 0,
  lengthIn: 10,
  widthIn: 8,
  heightIn: 4,
  enabledServices: ['PRIORITY_MAIL', 'USPS_GROUND_ADVANTAGE']
});
```

### 3. Address Validation

Standardizes an address to USPS format.

```typescript
const result = await uspsClient.validateAddress({
  firstName: 'John',
  lastName: 'Doe',
  streetAddress: '123 main st',
  city: 'anytown',
  state: 'NY',
  zipCode: '10001',
});
```

## Technical Notes

### Zod Validation
The library uses strict Zod schemas. For addresses, you **must** provide either `firstName` AND `lastName`, or a `firm` name. Failing to do so will result in a validation error before the API is even called.

### Server Logging
Requests are logged to the console with the `[USPS]` prefix to help you debug endpoint interactions in real-time.

## License

MIT
