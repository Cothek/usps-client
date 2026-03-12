# USPS Standalone Client

A modular, side-effect-free library for interacting with the USPS APIs (OAuth2, Address Validation, Rate Calculation, and Label Generation).

This library encapsulates the complexity of the USPS API into a single `USPSClient` class, providing a clean, modern interface for all interactions.

## Core Features

- **Automated OAuth2**: Transparently handles the entire OAuth2 token lifecycle.
- **Address Validation**: Cleanses and validates addresses using USPS DPV.
- **Rate Calculation**: Searches commercial base rates with support for custom service filtering.
- **Label Generation**: Creates 4x6 shipping labels in PDF format with automatic cropping.
- **Modern ESM Support**: Packaged as a pure ESM module with named exports for bundler compatibility.

## Installation

Add the library to your project via `npm` or your preferred package manager.

### Install from GitHub

To ensure a reliable installation over HTTPS, especially in CI/CD environments like Vercel, use the `github:` prefix.

```bash
npm install github:Cothek/usps-client
```

If you encounter an `ssh: command not found` or `Permission denied (publickey)` error, your environment may be defaulting to SSH. The command above is the recommended fix. As a fallback for a local machine, you can force Git to use HTTPS for all GitHub connections:

```bash
git config --global url."https://github.com/".insteadOf ssh://git@github.com/
```

### Peer Dependencies

Ensure your project has the required peer dependencies installed:

```bash
npm install pdf-lib zod
```

## Configuration

All configuration is handled via environment variables. Create a `.env` file in your project's root and add the following keys.

### Required Credentials

- `USPS_CONSUMER_KEY`: Your USPS API Consumer Key.
- `USPS_CONSUMER_SECRET`: Your USPS API Consumer Secret.
- `USPS_ENV`: The environment to target. Set to `production` for live requests or `development` for the Test Environment (TEM).
- `USPS_ORIGIN_ZIP_CODE`: The 5-digit ZIP code of your package's origin, used for rate calculations.

### Label Generation Details

These are required for creating shipping labels.

- `USPS_MID_NUMBER`: Your USPS Mailer ID.
- `USPS_CRID_NUMBER`: Your USPS Customer Registration ID.
- `USPS_EPS_ACCOUNT_NUMBER`: Your USPS Enterprise Payment System account number.

### Sender Address

This defines the `fromAddress` used in shipping labels.

- `USPS_FROM_NAME`: The sender's name or company name.
- `USPS_FROM_ADDRESS1`: The sender's street address.
- `USPS_FROM_CITY`: The sender's city.
- `USPS_FROM_STATE`: The sender's two-letter state code.
- `USPS_FROM_ZIP_CODE`: The sender's 5-digit ZIP code.

## Usage

### Initialization

The library is a pure ESM module. The `USPSClient` is the default export, while helper functions are available as named exports.

```typescript
import USPSClient from 'usps-client';

const uspsClient = new USPSClient({
  consumerKey: process.env.USPS_CONSUMER_KEY,
  consumerSecret: process.env.USPS_CONSUMER_SECRET,
  env: process.env.USPS_ENV === 'production' ? 'production' : 'development',
  originZipCode: process.env.USPS_ORIGIN_ZIP_CODE,
});
```

### Core Methods

All methods are asynchronous and return promises.

#### Validate an Address

```typescript
try {
  const { validated } = await uspsClient.validateAddress({
    streetAddress: '1600 Amphitheatre Pkwy',
    city: 'Mountain View',
    state: 'CA',
    zipCode: '94043',
  });

  // The 'validated' object contains the standardized address with 'zip5' and 'zip4' fields.
  console.log('Validated Address:', validated);
  // Example: {
  //   streetAddress: '1600 AMPHITHEATRE PKWY',
  //   city: 'MOUNTAIN VIEW',
  //   state: 'CA',
  //   zip5: '94043',
  //   zip4: '1351'
  // }
} catch (error) {
  console.error('Address validation failed:', error);
}
```

#### Get Shipping Rates

```typescript
try {
  const rates = await uspsClient.getRates({
    destinationZipCode: '90210',
    weightLbs: 1.5, // Can be a float
    lengthIn: 10,
    widthIn: 8,
    heightIn: 4,
  });
  console.log('Available Rates:', rates);
} catch (error) {
  console.error('Rate calculation failed:', error);
}
```

#### Create a Shipping Label

Creating a shipping label involves gathering your account details, defining the sender and recipient addresses, and describing the package. The `createLabel` method simplifies this by rolling it into a single API call.

Here’s a step-by-step guide:

1.  **Gather Your Credentials**: Ensure you have your USPS Mailer ID (`mid`), Customer Registration ID (`crid`), and Enterprise Payment System account number (`epsAccountNumber`). These are required for payment authorization and are typically stored as environment variables.

2.  **Define the `fromAddress`**: This object represents the sender's address. It should match the address associated with your USPS account.

3.  **Define the `toAddress`**: This object represents the recipient's address. For best results, it's recommended to validate this address using the `validateAddress` method before creating a label.

4.  **Specify `packageDetails`**: This object is crucial for a successful label request. You must accurately describe the package's contents, dimensions, weight, and the desired mail service.
    *   `mailClass`: Specifies the USPS service (e.g., `'PM'` for Priority Mail, `'FCM'` for First-Class Mail).
    *   `weight`: The package weight in pounds.
    *   `length`, `width`, `height`: The package dimensions in inches.
    *   `mailingDate`: The date the package will be shipped, in `YYYY-MM-DD` format.
    *   `contentType`: A general description of the contents (e.g., `'MERCHANDISE'`).

5.  **Call `createLabel`**: Pass the complete `LabelConfig` object to the `createLabel` method.

6.  **Process the Response**: If successful, the method returns an object containing the `trackingNumber` and the Base64-encoded PDF `labelUrl`. You can then save this PDF or display it to the user.

Here is a complete example bringing all the steps together:

```typescript
try {
  const label = await uspsClient.createLabel({
    // Step 1: Credentials
    mid: process.env.USPS_MID_NUMBER!,
    crid: process.env.USPS_CRID_NUMBER!,
    epsAccountNumber: process.env.USPS_EPS_ACCOUNT_NUMBER!,

    // Step 2: From Address
    fromAddress: {
      name: process.env.USPS_FROM_NAME!,
      streetAddress: process.env.USPS_FROM_ADDRESS1!,
      city: process.env.USPS_FROM_CITY!,
      state: process.env.USPS_FROM_STATE!,
      zipCode: process.env.USPS_FROM_ZIP_CODE!,
    },

    // Step 3: To Address
    toAddress: {
      name: 'Recipient Name',
      streetAddress: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '90210',
    },

    // Step 4: Package Details
    packageDetails: {
      contentType: 'MERCHANDISE',
      contentDescription: 'Sample items',
      mailClass: 'PM', // Priority Mail
      processingCategory: 'MACHINABLE',
      weight: 1.5, // in pounds
      length: 10,
      width: 8,
      height: 4,
      mailingDate: new Date().toISOString().split('T')[0],
    },
  });

  // Step 6: Handle the response
  console.log('Label Created:');
  console.log('  - Tracking Number:', label.trackingNumber);
  console.log('  - Label URL (Base64):', label.labelUrl.substring(0, 50) + '...');
} catch (error) {
  console.error('Label creation failed:', error);
}
```

### Direct Access (Named Exports)

For scenarios requiring more granular control, you can use the exported helper functions directly.

```typescript
async function fetchTokenManually() {
  const token = await getUspsAccessToken({
    consumerKey: process.env.USPS_CONSUMER_KEY!,
    consumerSecret: process.env.USPS_CONSUMER_SECRET!,
    env: 'development',
  });
  console.log('Fetched Token:', token);
}
```

## Testing with the TEM

The USPS Test Environment (TEM) is **not enabled by default** and must be manually activated for your account.

### 1. Request TEM Access

Email the USPS Web Tools team at `webtools@usps.gov` and request that your MID and CRID be activated for the TEM. They will confirm once this is complete.

**Failure to do this will result in a `Payment Authorization Failed (TEM)` error.**

### 2. Configure for Development

Set the environment variable in your `.env` file:

```
USPS_ENV=development
```

The `USPSClient` will automatically use the TEM endpoints when `env` is set to `development`.

## License

MIT
