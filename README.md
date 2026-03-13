# USPS Standalone Client

A modular, robust TypeScript library for interacting with the USPS v3 APIs (OAuth2, Address Validation, Rate Calculation, and Label Generation).

This library is hardened with **Zod validation and coercion**, ensuring that inputs from web forms (which often arrive as strings) are safely transformed into the precise numeric types required by the USPS OpenAPI specifications.

## Core Features

- **Automated OAuth2**: Transparently handles the entire OAuth2 token lifecycle.
- **Address Validation**: Standardizes and validates addresses using USPS DPV.
- **Hardened Rate Calculation**: Automatically coerces string inputs to numbers, preventing `NaN` serialization errors common in web forms.
- **Ergonomic Label Generation**: Store account credentials once in the constructor; generate labels with simplified address and package objects.
- **ESM Ready**: Fully compliant with modern NodeNext/ESM module resolution (requires `.js` extensions).
- **PDF Label Cropping**: Automatically crops 4x6 labels from USPS multipart responses using `pdf-lib`.

## Installation

Add the library to your project. Since this library relies on specific peer dependencies for PDF manipulation and validation, ensure they are installed in your host project:

```bash
npm install pdf-lib zod
```

Then install the client:

```bash
# If installing from a local directory
npm install ../path-to-usps-client

# If installing from a Git repository
npm install git+https://github.com/your-username/usps-client.git
```

## Configuration

Initialize the `USPSClient` with your API credentials. Account-level credentials (`mid`, `crid`, `epsAccountNumber`) are optional at initialization—they are only required if you intend to generate shipping labels.

```typescript
import USPSClient from 'usps-client';

const uspsClient = new USPSClient({
  consumerKey: process.env.USPS_CONSUMER_KEY!,
  consumerSecret: process.env.USPS_CONSUMER_SECRET!,
  env: process.env.USPS_ENV === 'production' ? 'production' : 'development',
  originZipCode: process.env.USPS_ORIGIN_ZIP_CODE!,
  
  // Optional: Only required for Label Generation
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
  // Library provides descriptive Zod errors if inputs are invalid
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

### Zod Coercion
The library uses `z.coerce.number()` for all numeric fields (weight, dimensions). This means you can safely pass values directly from `FormData.get()` or query parameters without manual `parseFloat()` calls.

### Server Logging
The client includes built-in logging to help you track which USPS endpoints are being reached. You will see `[USPS]` prefixed logs in your server console during requests.

## License

MIT
