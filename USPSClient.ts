import { PDFDocument } from 'pdf-lib';
import { AddressForValidation, LabelConfig, Rate, RateRequestData, UspsClientConfig, ValidatedAddress } from './types.js';
import { serviceFilterMap } from './constants.js';

export default class USPSClient {
  private config: UspsClientConfig;

  constructor(config: UspsClientConfig) {
    this.config = config;
  }

  async getAccessToken(): Promise<string> {
    const { consumerKey, consumerSecret, env } = this.config;

    if (!consumerKey || !consumerSecret) {
      throw new Error('USPS Consumer Key or Secret is missing from configuration.');
    }

    const uspsAuthBaseUrl = env === 'production' ? 'https://apis.usps.com' : 'https://apis-tem.usps.com';
    const uspsTokenEndpoint = `${uspsAuthBaseUrl}/oauth2/v3/token`;

    const tokenResponse = await fetch(uspsTokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: consumerKey,
        client_secret: consumerSecret,
        grant_type: 'client_credentials',
      }),
    });

    const tokenResponseText = await tokenResponse.text();
    let tokenData;
    try {
      tokenData = JSON.parse(tokenResponseText);
    } catch (e) {
      throw new Error(`USPS OAuth Token Request Failed: ${tokenResponse.status}. Response was not valid JSON.`);
    }

    if (!tokenResponse.ok) {
      throw new Error(`USPS OAuth Token Request Failed: ${tokenResponse.statusText}. ${tokenData.error_description || ''}`);
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error('USPS OAuth token not found in response.');
    }
    return accessToken;
  }

  async validateAddress(address: AddressForValidation) {
    const accessToken = await this.getAccessToken();
    const isProduction = this.config.env === 'production';
    const uspsApiBaseUrl = isProduction ? "https://apis.usps.com" : "https://apis-tem.usps.com";
    const validationEndpoint = `${uspsApiBaseUrl}/addresses/v3/address`;

    const queryParams: Record<string, string> = {
      streetAddress: address.streetAddress,
      city: address.city,
      state: address.state,
      // The USPS Address Validation API requires the parameter to be named 'ZIPCode'.
      ZIPCode: address.zipCode.split('-')[0],
    };

    if (address.secondaryAddress) {
      queryParams.secondaryAddress = address.secondaryAddress;
    }

    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&");

    const validationUrl = `${validationEndpoint}?${queryString}`;

    const response = await fetch(validationUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error("Failed to parse USPS address validation response.");
    }

    if (!response.ok) {
      throw new Error(responseData.error?.message || "Address validation failed.");
    }

    if (responseData.address) {
      const addr = responseData.address;
      const validated: ValidatedAddress = {
        streetAddress: addr.streetAddress,
        secondaryAddress: addr.secondaryAddress,
        city: addr.city,
        state: addr.state,
        zip5: addr.ZIPCode,
        zip4: addr.ZIPPlus4,
      };
      return {
        validated,
        matches: responseData.matches,
        additionalInfo: responseData.additionalInfo,
      };
    }
    
    throw new Error("Address not found.");
  }

  async getRates(request: RateRequestData) {
    if (!this.config.originZipCode || typeof this.config.originZipCode !== 'string') {
      throw new Error('USPS Client is not configured with an originZipCode.');
    }
    if (!request.destinationZipCode || typeof request.destinationZipCode !== 'string') {
      throw new Error('destinationZipCode is a required field for rate calculation.');
    }

    const accessToken = await this.getAccessToken();
    const isProduction = this.config.env === 'production';
    const uspsApiBaseUrl = isProduction ? 'https://apis.usps.com' : 'https://apis-tem.usps.com';
    const apiUrl = `${uspsApiBaseUrl}/prices/v3/base-rates-list/search`;

    // Note: The USPS Rates API requires specific ZIP code formats.
    const requestBody = {
      originZIPCode: this.config.originZipCode.split('-')[0],
      destinationZIPCode: request.destinationZipCode.split('-')[0],
      weight: Number(request.weightLbs) + (Number(request.weightOz) / 16),
      unitOfMeasure: 'POUND',
      length: request.lengthIn,
      width: request.widthIn,
      height: request.heightIn,
      processingCategory: 'MACHINABLE',
      rateIndicator: 'SP',
      mailingDate: new Date().toISOString().split('T')[0],
      destinationEntryFacilityType: 'NONE',
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData?.error?.message || "Failed to fetch shipping rates.");
    }

    const uniqueRates = new Map<string, Rate>();

    if (responseData.rateOptions && Array.isArray(responseData.rateOptions)) {
      responseData.rateOptions.forEach((rateOption: any) => {
        if (!rateOption.rates || !Array.isArray(rateOption.rates) || rateOption.rates.length === 0) return;
        
        const primaryRateInfo = rateOption.rates[0];
        const serviceName = primaryRateInfo.description || primaryRateInfo.productName;

        if (serviceName && primaryRateInfo.mailClass && rateOption.totalBasePrice > 0) {
          const rate: Rate = {
            serviceName,
            mailClass: primaryRateInfo.mailClass,
            price: rateOption.totalBasePrice,
          };

          const existingRate = uniqueRates.get(rate.serviceName);
          if (!existingRate || existingRate.price > rate.price) {
            uniqueRates.set(rate.serviceName, rate);
          }
        }
      });
    }

    let parsedRates = Array.from(uniqueRates.values());
    
    if (request.enabledServices && request.enabledServices.length > 0) {
      const enabledFilters = new Set(request.enabledServices);
      parsedRates = parsedRates.filter(rate => {
        const description = rate.serviceName.toLowerCase();
        for (const filterId of enabledFilters) {
          const filter = serviceFilterMap[filterId];
          if (filter) {
            const mailClassMatch = filter.mailClasses.includes(rate.mailClass);
            const keywordMatch = filter.keywords.some(kw => description.includes(kw));
            const exclusionMatch = filter.exclusions?.some(ex => description.includes(ex)) ?? false;
            if (mailClassMatch && keywordMatch && !exclusionMatch) return true;
          }
        }
        return false;
      });
    }

    return parsedRates.sort((a, b) => a.price - b.price);
  }

  async createLabel(config: LabelConfig) {
    const accessToken = await this.getAccessToken();
    const isProduction = this.config.env === 'production';
    const uspsApiBaseUrl = isProduction ? 'https://apis.usps.com' : 'https://apis-tem.usps.com';
    
    // 1. Payment Auth
    const paymentAuthEndpoint = `${uspsApiBaseUrl}/payments/v3/payment-authorization`;
    const paymentAuthBody = {
      paymentMethods: [{ accountNumber: config.epsAccountNumber, paymentTypes: ['SHIPPING_LABEL'] }],
      roles: [
        { roleName: 'PAYER', CRID: config.crid, MID: config.mid, manifestMID: config.mid, accountType: 'EPS', accountNumber: config.epsAccountNumber },
        { roleName: 'LABEL_OWNER', CRID: config.crid, MID: config.mid, manifestMID: config.mid },
      ],
    };

    const paymentResponse = await fetch(paymentAuthEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(paymentAuthBody),
    });

    const paymentData = await paymentResponse.json();
    if (!paymentResponse.ok) throw new Error("Payment authorization failed.");
    const paymentToken = paymentData.paymentAuthorizationToken;

    // 2. Create Label
    const { zipCode: fromZip, ...fromAddressRest } = config.fromAddress;
    const { zipCode: toZip, ...toAddressRest } = config.toAddress;
    const labelEndpoint = `${uspsApiBaseUrl}/labels/v3/label`;
    
    // Note: The USPS Label API requires address keys to be 'ZIPCode', not 'zipCode'.
    // The following object construction maps our internal `zipCode` to the required external format.
    const labelBody = {
      requester: { requesterId: config.mid, mailingActivity: 'PERMIT_HOLDER_OR_END_USER' },
      fromAddress: { ...fromAddressRest, ZIPCode: fromZip },
      toAddress: { ...toAddressRest, ZIPCode: toZip },
      packageDescription: config.packageDetails,
      imageParameters: { imageFormat: 'PDF', labelLayout: 'LABEL_4X6' },
    };

    const labelResponse = await fetch(labelEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Payment-Authorization-Token': paymentToken,
      },
      body: JSON.stringify(labelBody),
    });

    if (!labelResponse.ok) {
      const errText = await labelResponse.text();
      throw new Error(`Label API failed: ${errText}`);
    }

    const contentType = labelResponse.headers.get('Content-Type');
    if (!contentType?.includes('multipart/form-data')) throw new Error("Unexpected response format from USPS.");

    const responseText = await labelResponse.text();
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) throw new Error("Multipart boundary not found.");
    
    const boundary = `--${boundaryMatch[1]}`;
    const parts = responseText.split(boundary).filter(p => p.trim() !== '' && p.trim() !== '--');

    let metadataPart: any;
    let imagePartStr: string | undefined;

    for (const part of parts) {
      if (part.includes('name="labelMetadata"')) {
        const body = part.substring(part.indexOf('\r\n\r\n') + 4).trim();
        metadataPart = JSON.parse(body);
      } else if (part.includes('filename="labelImage.pdf"')) {
        imagePartStr = part.substring(part.indexOf('\r\n\r\n') + 4).trim().replace(/\s/g, '');
      }
    }

    if (!metadataPart || !imagePartStr) throw new Error("Missing metadata or image in response.");

    // 3. Process PDF (Crop)
    const pdfBuffer = Buffer.from(imagePartStr, 'base64');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const page = pdfDoc.getPage(0);
    const labelWidth = 4 * 72;
    const labelHeight = 6 * 72;
    const pageHeight = page.getHeight();
    const margin = 60;
    
    page.setCropBox(margin, pageHeight - margin - 30 - labelHeight, labelWidth, labelHeight);
    
    const croppedBytes = await pdfDoc.save();
    const base64 = Buffer.from(croppedBytes).toString('base64');

    return {
      trackingNumber: metadataPart.trackingNumber,
      labelUrl: `data:application/pdf;base64,${base64}`,
      metadata: metadataPart,
    };
  }
}
