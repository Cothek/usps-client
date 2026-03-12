# USPS Standalone Client

A modular, robust library for interacting with the USPS v3 APIs (OAuth2, Address Validation, Rate Calculation, and Label Generation).

This library is hardened with **Zod validation and coercion**, ensuring that inputs from web forms (which often arrive as strings) are safely transformed into the precise numeric types required by the USPS OpenAPI specifications.

## Core Features

- **Automated OAuth2**: Transparently handles the entire OAuth2 token lifecycle for Production and TEM environments.
- **Address Validation**: Standardizes and validates addresses using USPS DPV (Delivery Point Validation).
- **Hardened Rate Calculation**: Automatically coerces string inputs (like "5.5" lbs) to numbers, preventing `NaN` and `null` serialization errors in the USPS API.
- **Label Generation**: Creates 4x6 shipping labels in PDF format with automatic cropping for print-readiness.
- **ESM Ready**: Fully compliant with modern NodeNext/ESM module resolution.

## Installation

Add the library to your project.

### Peer Dependencies

Ensure your project has the required peer dependencies installed:

```bash
npm install pdf-lib zod
```

## Configuration

Initialize the `USPSClient` with your credentials. The library will validate these settings immediately upon construction.

```typescript
import USPSClient from 'usps-client';

const uspsClient = new USPSClient({
  consumerKey: process.env.USPS_CONSUMER_KEY!,
  consumerSecret: process.env.USPS_CONSUMER_SECRET!,
  env: process.env.USPS_ENV === 'production' ? 'production' : 'development',
  originZipCode: process.env.USPS_ORIGIN_ZIP_CODE!,
});
```

## Usage

### 1. Validate an Address

Standardize user input into a USPS-recognized format.

```typescript
try {
  const { validated } = await uspsClient.validateAddress({
    streetAddress: '1600 Amphitheatre Pkwy',
    city: 'Mountain View',
    state: 'CA',
    zipCode: '94043',
  });

  console.log('Validated Address:', validated);
} catch (error) {
  console.error('Validation Error:', error.message);
}
```

### 2. Get Shipping Rates (Hardened)

The library uses Zod coercion. You can pass values directly from a `FormData` object or a string-based state, and the library will handle the conversion.

```typescript
try {
  const rates = await uspsClient.getRates({
    destinationZipCode: '90210',
    weightLbs: "1.5", // Coerced to 1.5 (number)
    weightOz: 0,
    lengthIn: "10",  // Coerced to 10 (number)
    widthIn: "8",
    heightIn: "4",
  });
  console.log('Available Rates:', rates);
} catch (error) {
  // Catches validation errors locally before they reach the USPS server
  console.error('Rate Error:', error.message);
}
```

### 3. Create a Shipping Label

Generates a print-ready 4x6 label.

```typescript
try {
  const label = await uspsClient.createLabel({
    mid: process.env.USPS_MID!,
    crid: process.env.USPS_CRID!,
    epsAccountNumber: process.env.USPS_EPS_ACCOUNT!,
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
      weight: 2.0,
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

## Troubleshooting: OAS Validation Errors

If you previously received errors like `Instance type (null) does not match any allowed primitive type` for `weight`, it was because non-numeric values (like strings or `NaN`) were being serialized. This library now uses `z.coerce.number()` and `finite()` checks to ensure only valid numeric types are sent to the API.

## License

MIT
