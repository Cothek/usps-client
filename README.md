# USPS Standalone Client

A modular, robust TypeScript library for interacting with the USPS v3 APIs (OAuth2, Address Validation, Rate Calculation, and Label Generation).

This library is hardened with **Zod validation and coercion**, ensuring that inputs from web forms are safely transformed into the precise types required by the USPS OpenAPI specifications.

## Installation

This library is designed to be installed directly from GitHub.

```bash
# 1. Install peer dependencies
npm install pdf-lib zod

# 2. Install the client
npm install github:Cothek/usps-client
```

## Configuration

Initialize the `USPSClient` with your API credentials. Account-level credentials (`mid`, `crid`, `epsAccountNumber`) are provided once at initialization and are required for label generation.

```typescript
import USPSClient from 'usps-client';

const uspsClient = new USPSClient({
  consumerKey: process.env.USPS_CONSUMER_KEY!,
  consumerSecret: process.env.USPS_CONSUMER_SECRET!,
  env: process.env.USPS_ENV === 'production' ? 'production' : 'development',
  originZipCode: process.env.USPS_ORIGIN_ZIP_CODE!,
  
  // Required for Label Generation
  mid: process.env.USPS_MID,
  crid: process.env.USPS_CRID,
  epsAccountNumber: process.env.USPS_EPS_ACCOUNT,
});
```

## Usage

### 1. Create a Shipping Label

Generates a print-ready 4x6 label. The USPS Label API strictly requires either `firstName` AND `lastName`, or a `firm` name for both addresses. All fields in `packageDetails` are mandatory.

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
      zipCode: '90210-1234',
    },
    packageDetails: {
      contentType: 'MERCHANDISE', // See ContentType enum
      contentDescription: 'Custom Widget',
      mailClass: 'PM', // Priority Mail
      processingCategory: 'MACHINABLE', // See ProcessingCategory enum
      weight: 2.5,
      length: 12,
      width: 9,
      height: 6,
      mailingDate: '2025-03-12', // YYYY-MM-DD
    },
  });

  console.log('Tracking Number:', label.trackingNumber);
} catch (error) {
  // If validation fails, error.message will contain a JSON string of Zod errors
  console.error('Label Error:', error.message);
}
```

### 2. Get Shipping Rates

```typescript
const rates = await uspsClient.getRates({
  destinationZipCode: '90210',
  weightLbs: 1,
  weightOz: 8,
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
  streetAddress: '123 main st',
  city: 'anytown',
  state: 'NY',
  zipCode: '10001',
  // Label requirements for name/firm do not apply to basic validation
});
```

## Mandatory Enum Values

### ContentType
`'HAZMAT'`, `'CREMATED_REMAINS'`, `'LIVES'`, `'PERISHABLE'`, `'PHARMACEUTICALS'`, `'MEDICAL_SUPPLIES'`, `'FRAGILE'`, `'MERCHANDISE'`

### ProcessingCategory
`'LETTERS'`, `'FLATS'`, `'MACHINABLE'`, `'NON_MACHINABLE'`, `'IRREGULAR'`

## License

MIT
