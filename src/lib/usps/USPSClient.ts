import { PDFDocument } from 'pdf-lib';
import { 
  AddressForValidation, 
  LabelConfig, 
  Rate, 
  RateRequestData, 
  UspsClientConfig, 
  ValidatedAddress 
} from './types.js';
import { serviceFilterMap } from './constants.js';
import { 
  UspsClientConfigSchema, 
  AddressSchema, 
  RateRequestSchema, 
  LabelConfigSchema 
} from './schemas.js';

/**
 * USPSClient - A hardened client for the USPS v3 APIs.
 */
export default class USPSClient {
  private config: UspsClientConfig;

  constructor(config: UspsClientConfig) {
    this.config = UspsClientConfigSchema.parse(config);
  }

  async getAccessToken(): Promise<string> {
    const { consumerKey, consumerSecret, env } = this.config;
    const uspsAuthBaseUrl = env === 'production' ? 'https://apis.usps.com' : 'https://apis-tem.usps.com';
    const uspsTokenEndpoint = `${uspsAuthBaseUrl}/oauth2/v3/token`;

    console.log(`[USPS] Requesting OAuth token from: ${uspsTokenEndpoint}`);

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
      throw new Error(`USPS OAuth Token Request Failed: ${tokenResponse.status}. ${errorData.error_description || ''}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  }

  async validateAddress(address: AddressForValidation) {
    const validatedInput = AddressSchema.parse(address);
    const accessToken = await this.getAccessToken();
    const isProduction = this.config.env === 'production';
    const uspsApiBaseUrl = isProduction ? "https://apis.usps.com" : "https://apis-tem.usps.com";
    
    const queryParams = new URLSearchParams({
      streetAddress: validatedInput.streetAddress,
      city: validatedInput.city,
      state: validatedInput.state,
      ZIPCode: validatedInput.zipCode.split('-')[0],
    });

    if (validatedInput.secondaryAddress) {
      queryParams.append('secondaryAddress', validatedInput.secondaryAddress);
    }

    const url = `${uspsApiBaseUrl}/addresses/v3/address?${queryParams.toString()}`;
    console.log(`[USPS] Validating address at: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const responseData = await response.json();
    if (!response.ok) throw new Error(responseData.error?.message || "Address validation failed.");

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
      return { validated, matches: responseData.matches, additionalInfo: responseData.additionalInfo };
    }
    throw new Error("Address not found.");
  }

  async getRates(request: RateRequestData) {
    const validatedRequest = RateRequestSchema.parse(request);
    const accessToken = await this.getAccessToken();
    const isProduction = this.config.env === 'production';
    const uspsApiBaseUrl = isProduction ? 'https://apis.usps.com' : 'https://apis-tem.usps.com';
    
    const totalWeight = validatedRequest.weightLbs + (validatedRequest.weightOz / 16);

    const requestBody = {
      originZIPCode: this.config.originZipCode.split('-')[0],
      destinationZIPCode: validatedRequest.destinationZipCode.split('-')[0],
      weight: parseFloat(totalWeight.toFixed(3)),
      unitOfMeasure: 'POUND',
      length: validatedRequest.lengthIn,
      width: validatedRequest.widthIn,
      height: validatedRequest.heightIn,
      processingCategory: 'MACHINABLE',
      rateIndicator: 'SP',
      mailingDate: new Date().toISOString().split('T')[0],
      destinationEntryFacilityType: 'NONE',
    };

    const url = `${uspsApiBaseUrl}/prices/v3/base-rates-list/search`;
    console.log(`[USPS] Fetching rates from: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();
    if (!response.ok) {
      const msg = responseData?.error?.message || responseData?.message || "Failed to fetch rates.";
      throw new Error(`USPS Rate Error: ${msg}`);
    }

    const uniqueRates = new Map<string, Rate>();
    if (responseData.rateOptions) {
      responseData.rateOptions.forEach((opt: any) => {
        const primary = opt.rates?.[0];
        if (primary && opt.totalBasePrice > 0) {
          const serviceName = (primary.description || primary.productName) as string;
          const rate: Rate = { serviceName, mailClass: primary.mailClass, price: opt.totalBasePrice };
          const existing = uniqueRates.get(serviceName);
          if (!existing || existing.price > rate.price) uniqueRates.set(serviceName, rate);
        }
      });
    }

    let parsedRates = Array.from(uniqueRates.values());
    if (validatedRequest.enabledServices?.length) {
      const filters = new Set(validatedRequest.enabledServices);
      parsedRates = parsedRates.filter(rate => {
        const desc = rate.serviceName.toLowerCase();
        for (const fid of filters) {
          const f = serviceFilterMap[fid];
          if (f && f.mailClasses.includes(rate.mailClass)) {
            const kw = f.keywords.some((k: string) => desc.includes(k));
            const ex = f.exclusions?.some((e: string) => desc.includes(e)) ?? false;
            if (kw && !ex) return true;
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
    
    const mid = this.config.mid;
    const crid = this.config.crid;
    const epsAccountNumber = this.config.epsAccountNumber;

    if (!mid || !crid || !epsAccountNumber) {
      throw new Error("Missing required USPS account credentials (MID, CRID, or EPS Account Number) for label generation. Please provide them in the USPSClient constructor.");
    }

    const paymentAuthUrl = `${uspsApiBaseUrl}/payments/v3/payment-authorization`;
    console.log(`[USPS] Requesting payment authorization from: ${paymentAuthUrl}`);
    
    const paymentResponse = await fetch(paymentAuthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        paymentMethods: [{ accountNumber: epsAccountNumber, paymentTypes: ['SHIPPING_LABEL'] }],
        roles: [
          { roleName: 'PAYER', CRID: crid, MID: mid, manifestMID: mid, accountType: 'EPS', accountNumber: epsAccountNumber },
          { roleName: 'LABEL_OWNER', CRID: crid, MID: mid, manifestMID: mid },
        ],
      }),
    });

    if (!paymentResponse.ok) {
        const err = await paymentResponse.json().catch(() => ({}));
        throw new Error(`Payment authorization failed: ${err.error?.message || paymentResponse.statusText}`);
    }
    const { paymentAuthorizationToken: paymentToken } = await paymentResponse.json();

    const formatAddress = (addr: any) => {
      const { zipCode, ...rest } = addr;
      return { ...rest, ZIPCode: zipCode };
    };
    
    const labelBody = {
      requester: { requesterId: mid, mailingActivity: 'PERMIT_HOLDER_OR_END_USER' },
      fromAddress: formatAddress(validatedConfig.fromAddress),
      toAddress: formatAddress(validatedConfig.toAddress),
      packageDescription: {
        ...validatedConfig.packageDetails,
        unitOfMeasure: 'POUND',
        rateIndicator: 'SP',
        destinationEntryFacilityType: 'NONE'
      },
      imageParameters: { imageFormat: 'PDF', labelLayout: 'LABEL_4X6' },
    };

    const labelUrl = `${uspsApiBaseUrl}/labels/v3/label`;
    console.log(`[USPS] Generating label at: ${labelUrl}`);

    const labelResponse = await fetch(labelUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Payment-Authorization-Token': paymentToken,
      },
      body: JSON.stringify(labelBody),
    });

    if (!labelResponse.ok) {
      const errorText = await labelResponse.text();
      throw new Error(`Label API failed: ${errorText}`);
    }

    const responseText = await labelResponse.text();
    const boundaryMatch = labelResponse.headers.get('Content-Type')?.match(/boundary=(.+)/);
    const boundary = boundaryMatch ? `--${boundaryMatch[1]}` : null;
    if (!boundary) throw new Error("Multipart boundary not found.");
    
    const parts = responseText.split(boundary);
    let meta: any, imgStr: string | undefined;

    for (const p of parts) {
      if (p.includes('name="labelMetadata"')) {
        const contentStart = p.indexOf('\r\n\r\n') + 4;
        meta = JSON.parse(p.substring(contentStart).trim());
      } else if (p.includes('filename="labelImage.pdf"')) {
        const contentStart = p.indexOf('\r\n\r\n') + 4;
        imgStr = p.substring(contentStart).trim().replace(/\s/g, '');
      }
    }

    if (!meta || !imgStr) throw new Error("Missing response data from USPS multipart response.");

    const pdfDoc = await PDFDocument.load(Buffer.from(imgStr, 'base64'));
    const page = pdfDoc.getPage(0);
    const [lW, lH, margin] = [4 * 72, 6 * 72, 60];
    page.setCropBox(margin, page.getHeight() - margin - 30 - lH, lW, lH);
    
    return {
      trackingNumber: meta.trackingNumber,
      labelUrl: `data:application/pdf;base64,${Buffer.from(await pdfDoc.save()).toString('base64')}`,
      metadata: meta,
    };
  }
}
