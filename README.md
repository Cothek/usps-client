# USPS Standalone Client

A modular, side-effect-free library for interacting with the USPS APIs (OAuth2, Address Validation, Rate Calculation, and Label Generation).

This library encapsulates the complexity of the USPS API into a single `USPSClient` class.

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
npm install github:Cothek/usps-client

# OR using the full HTTPS URL
npm install git+https://github.com/Cothek/usps-client.git
```

### Troubleshooting: "ssh: command not found"

If you encounter an error like `ssh: command not found` or `fatal: Could not read from remote repository` while installing, it is because your environment is trying to use SSH instead of HTTPS. Run the following command in your terminal to force Git to use HTTPS for GitHub:

```bash
git config --global url."https://github.com/".insteadOf ssh://git@github.com/
```

After running this command, try the `npm install` again.

### Peer Dependencies

Ensure your target project has the required peer dependencies installed:

```bash
npm install pdf-lib zod
```

## Features

Provides a single `USPSClient` class that handles:

- **OAuth2**: Automatic and transparent token lifecycle management.
- **Address Validation**: DPV validation and address cleansing.
- **Rate Calculation**: Commercial base rate search with support for custom service filtering.
- **Label Generation**: PDF label generation with automatic cropping to 4x6 format.

## Required Environment Variables

To use this library effectively, define the following variables in your `.env` file:

### API Credentials & Configuration

- `USPS_CONSUMER_KEY`: Your USPS API Consumer Key.
- `USPS_CONSUMER_SECRET`: Your USPS API Consumer Secret.
- `USPS_ENV`: Set to `production` for live APIs, or `development` for the test environment (TEM).
- `USPS_ORIGIN_ZIP`: The 5-digit ZIP code from which you are sending packages. This is used for rate calculations.

### Label Generation (Payment & Identity)

- `USPS_MID_NUMBER`: Your USPS Mailer ID.
- `USPS_CRID_NUMBER`: Your USPS Customer Registration ID.
- `USPS_EPS_ACCOUNT_NUMBER`: Your USPS Enterprise Payment System account number.

### Full Origin Address (Sender)

This is required for the `fromAddress` field when creating labels.

- `USPS_FROM_NAME`: Sender name/Firm name.
- `USPS_FROM_ADDRESS1`: Street address.
- `USPS_FROM_CITY`: City.
- `USPS_FROM_STATE`: State (2-letter code).
- `USPS_FROM_ZIP5`: 5-digit ZIP code. (Note: Can be the same as `USPS_ORIGIN_ZIP`).

## Usage Example

### 1. Initialize the Client

First, import and instantiate the `USPSClient` with your configuration. The client will handle access tokens automatically.

```typescript
import USPSClient from 'usps-client';

const uspsClient = new USPSClient({
  consumerKey: process.env.USPS_CONSUMER_KEY,
  consumerSecret: process.env.USPS_CONSUMER_SECRET,
  env: process.env.USPS_ENV === 'production' ? 'production' : 'development',
  originZip: process.env.USPS_ORIGIN_ZIP,
});
```

### 2. Validate an Address

```typescript
try {
  const validationResult = await uspsClient.validateAddress({
    streetAddress: '1600 Amphitheatre Pkwy',
    city: 'Mountain View',
    state: 'CA',
    zipCode: '94043',
  });
  console.log('Validated Address:', validationResult.validated);
} catch (error) {
  console.error('Address validation failed:', error);
}
```

### 3. Get Shipping Rates

```typescript
try {
  const rates = await uspsClient.getRates({
    destinationZip: '90210',
    weightLbs: 1,
    weightOz: 0,
    lengthIn: 6,
    widthIn: 4,
    heightIn: 2,
  });
  console.log('Shipping Rates:', rates);
} catch (error) {
  console.error('Failed to get rates:', error);
}
```

### 4. Create a Shipping Label

```typescript
try {
  const label = await uspsClient.createLabel({
    mid: process.env.USPS_MID_NUMBER,
    crid: process.env.USPS_CRID_NUMBER,
    epsAccountNumber: process.env.USPS_EPS_ACCOUNT_NUMBER,
    fromAddress: {
      name: process.env.USPS_FROM_NAME,
      streetAddress: process.env.USPS_FROM_ADDRESS1,
      city: process.env.USPS_FROM_CITY,
      state: process.env.USPS_FROM_STATE,
      ZIPCode: process.env.USPS_FROM_ZIP5,
      country: 'US',
    },
    toAddress: {
      name: 'Recipient Name',
      streetAddress: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      ZIPCode: '90210',
      country: 'US',
    },
    packageDetails: {
      contentType: 'MERCHANDISE',
      contentDescription: 'Sample items',
      destinationEntryFacilityType: 'NONE',
      mailClass: 'PM', // Example: Priority Mail
      processingCategory: 'MACHINABLE',
      weight: 1, // in pounds
      length: 6,
      width: 4,
      height: 2,
      unitOfMeasure: 'POUND',
      mailingDate: new Date().toISOString().split('T')[0],
      rateIndicator: 'SP',
    },
  });

  console.log('Label created successfully:');
  console.log('Tracking Number:', label.trackingNumber);
  console.log('Label URL (base64-encoded PDF):', label.labelUrl);
} catch (error) {
  console.error('Label creation failed:', error);
}
```

## License

MIT
