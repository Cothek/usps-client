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

### 1. Get Shipping Rates (Hardened)

The library handles conversion from string inputs (like those from `FormData`) automatically using Zod coercion.

```typescript
try {
  const rates = await uspsClient.getRates({
    destinationZipCode: '90210',
    weightLbs: "1.5", // Automatically coerced from string
    weightOz: 0,
    lengthIn: 10,
    widthIn: 8,
    heightIn: 4,
    // Optional: Filter for specific service types
    enabledServices: ['PRIORITY_MAIL', 'USPS_GROUND_ADVANTAGE']
  });

  console.log('Available Rates:', rates);
} catch (error) {
  console.error('Rate Error:', error.message);
}
```

### 2. Create a Shipping Label

Generates a print-ready 4x6 label. Credentials provided in the constructor are used automatically.

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
      weight: 2.5,
      length: 12,
      width: 9,
      height: 6,
      mailingDate: '2025-01-01', // YYYY-MM-DD
    },
  });

  console.log('Tracking Number:', label.trackingNumber);
  // label.labelUrl is a base64 Data URI for the PDF (application/pdf)
} catch (error) {
  console.error('Label Error:', error.message);
}
```

### 3. Address Validation

Standardizes an address to USPS format.

```typescript
const result = await uspsClient.validateAddress({
  streetAddress: '123 main st',
  city: 'anytown',
  state: 'NY',
  zipCode: '10001',
});

if (result.matches) {
  console.log('Standardized Address:', result.validated);
}
```

## Technical Notes

### Stable Entry Points
The library uses `index.ts` in the root as a stable export barrel. This means internal file restructuring (like moving code into `src/`) will not break your existing imports as long as you import from the root package.

### Zod Coercion
We use `z.coerce.number()` for all numeric fields. You can safely pass values directly from `FormData.get()` without manual conversion.

### Server Logging
Requests are logged to the console with the `[USPS]` prefix to help you debug endpoint interactions in real-time.

## License

MIT
