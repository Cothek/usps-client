# USPS Standalone Client

A modular, robust library for interacting with the USPS v3 APIs (OAuth2, Address Validation, Rate Calculation, and Label Generation).

This library is hardened with **Zod validation and coercion**, ensuring that inputs from web forms (which often arrive as strings) are safely transformed into the precise numeric types required by the USPS OpenAPI specifications.

## Core Features

- **Automated OAuth2**: Transparently handles the entire OAuth2 token lifecycle.
- **Address Validation**: Standardizes and validates addresses using USPS DPV.
- **Hardened Rate Calculation**: Automatically coerces string inputs to numbers, preventing `NaN` serialization errors.
- **Ergonomic Label Generation**: Store credentials once in the constructor; generate labels with simple address and package objects.
- **ESM Ready**: Fully compliant with modern NodeNext/ESM module resolution.

## Installation

Add the library to your project. Ensure your project has the required peer dependencies:

```bash
npm install pdf-lib zod
```

## Configuration

Initialize the `USPSClient` with your account credentials. The library will validate these settings immediately.

```typescript
import USPSClient from 'usps-client';

const uspsClient = new USPSClient({
  consumerKey: process.env.USPS_CONSUMER_KEY!,
  consumerSecret: process.env.USPS_CONSUMER_SECRET!,
  env: process.env.USPS_ENV === 'production' ? 'production' : 'development',
  originZipCode: process.env.USPS_ORIGIN_ZIP_CODE!,
  // Account level credentials (set once)
  mid: process.env.USPS_MID!,
  crid: process.env.USPS_CRID!,
  epsAccountNumber: process.env.USPS_EPS_ACCOUNT!,
});
```

## Usage

### 1. Create a Shipping Label

Generates a print-ready 4x6 label. Credentials from the constructor are automatically used.

```typescript
try {
  const label = await uspsClient.createLabel({
    fromAddress: {
      name: 'John Doe',
      streetAddress: '123 Main St',
      city: 'Anytown',
      state: 'NY',
      zipCode: '10001',
    },
    toAddress: {
      name: 'Jane Smith',
      streetAddress: '456 Side St',
      city: 'Othertown',
      state: 'CA',
      zipCode: '90210',
    },
    packageDetails: {
      contentDescription: 'Books',
      mailClass: 'PM', // Priority Mail
      weight: "2.0",  // Coerced from string
      length: 12,
      width: 9,
      height: 6,
      mailingDate: '2025-01-01',
    },
  });

  console.log('Tracking Number:', label.trackingNumber);
  // label.labelUrl is a base64 Data URI for the PDF
} catch (error) {
  console.error('Label Error:', error.message);
}
```

### 2. Get Shipping Rates (Hardened)

The library handles conversion from string inputs (like those from `FormData`) automatically.

```typescript
const rates = await uspsClient.getRates({
  destinationZipCode: '90210',
  weightLbs: "1.5", 
  weightOz: 0,
  lengthIn: "10",
  widthIn: "8",
  heightIn: "4",
});
```

## License

MIT
