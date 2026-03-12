import { PDFDocument } from 'pdf-lib';
import { 
  AddressForValidation, 
  LabelConfig, 
  Rate, 
  RateRequestData, 
  UspsClientConfig, 
  ValidatedAddress 
} from './types';
import { serviceFilterMap } from './constants';
import { 
  UspsClientConfigSchema, 
  AddressSchema, 
  RateRequestSchema, 
  LabelConfigSchema 
} from './schemas';

export default class USPSClient {
  private config: UspsClientConfig;

  constructor(config: UspsClientConfig) {
    this.config = UspsClientConfigSchema.parse(config);
  }

  async getAccessToken(): Promise<string> {
    const { consumerKey, consumerSecret, env } = this.config;

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

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      throw new Error(`USPS OAuth Token Request Failed: ${tokenResponse.statusText}. ${errorData.error_description || ''}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error('USPS OAuth token not found in response.');
    }
    return accessToken;
  }

  async validateAddress(address: AddressForValidation) {
    const validatedInput = AddressSchema.parse(address);
    const accessToken = await this.getAccessToken();
    const isProduction = this.config.env === 'production';
    const uspsApiBaseUrl = isProduction ? "https://apis.usps.com" : "https://apis-tem.usps.com";
    const validationEndpoint = `${uspsApiBaseUrl}/addresses/v3/address`;

    const queryParams: Record<string, string> = {
      streetAddress: validatedInput.streetAddress,
      city: validatedInput.city,
      state: validatedInput.state,
      ZIPCode: validatedInput.zipCode.split('-')[0],
    };

    if (validatedInput.secondaryAddress) {
      queryParams.secondaryAddress = validatedInput.secondaryAddress;
    }

    const queryString = new URLSearchParams(queryParams).toString();
    const validationUrl = `${validationEndpoint}?${queryString}`;

    const response = await fetch(validationUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const responseData = await response.json();

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
    const validatedRequest = RateRequestSchema.parse(request);
    const accessToken = await this.getAccessToken();
    const isProduction = this.config.env === 'production';
    const uspsApiBaseUrl = isProduction ? 'https://apis.usps.com' : 'https://apis-tem.usps.com';
    const apiUrl = `${uspsApiBaseUrl}/prices/v3/base-rates-list/search`;

    const requestBody = {
      originZIPCode: this.config.originZipCode.split('-')[0],
      destinationZIPCode: validatedRequest.destinationZipCode.split('-')[0],
      weight: validatedRequest.weightLbs + (validatedRequest.weightOz / 16),
      unitOfMeasure: 'POUND',
      length: validatedRequest.lengthIn,
      width: validatedRequest.widthIn,
      height: validatedRequest.heightIn,
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
    
    if (validatedRequest.enabledServices && validatedRequest.enabledServices.length > 0) {
      const enabledFilters = new Set(validatedRequest.enabledServices);
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
    const validatedConfig = LabelConfigSchema.parse(config);
    const accessToken = await this.getAccessToken();
    const isProduction = this.config.env === 'production';
    const uspsApiBaseUrl = isProduction ? 'https://apis.usps.com' : 'https://apis-tem.usps.com';
    
    const paymentAuthEndpoint = `${uspsApiBaseUrl}/payments/v3/payment-authorization`;
    const paymentAuthBody = {
      paymentMethods: [{ accountNumber: validatedConfig.epsAccountNumber, paymentTypes: ['SHIPPING_LABEL'] }],
      roles: [
        { roleName: 'PAYER', CRID: validatedConfig.crid, MID: validatedConfig.mid, manifestMID: validatedConfig.mid, accountType: 'EPS', accountNumber: validatedConfig.epsAccountNumber },
        { roleName: 'LABEL_OWNER', CRID: validatedConfig.crid, MID: validatedConfig.mid, manifestMID: validatedConfig.mid },
      ],
    };

    const paymentResponse = await fetch(paymentAuthEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(paymentAuthBody),
    });

    if (!paymentResponse.ok) throw new Error("Payment authorization failed.");
    const paymentData = await paymentResponse.json();
    const paymentToken = paymentData.paymentAuthorizationToken;

    const { zipCode: fromZip, ...fromAddressRest } = validatedConfig.fromAddress;
    const { zipCode: toZip, ...toAddressRest } = validatedConfig.toAddress;
    const labelEndpoint = `${uspsApiBaseUrl}/labels/v3/label`;
    
    const labelBody = {
      requester: { requesterId: validatedConfig.mid, mailingActivity: 'PERMIT_HOLDER_OR_END_USER' },
      fromAddress: { ...fromAddressRest, ZIPCode: fromZip },
      toAddress: { ...toAddressRest, ZIPCode: toZip },
      packageDescription: {
        ...validatedConfig.packageDetails,
        unitOfMeasure: 'POUND',
        rateIndicator: 'SP',
        destinationEntryFacilityType: 'NONE'
      },
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
