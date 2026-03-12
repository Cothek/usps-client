/**
 * @fileOverview Type definitions for the standalone USPS client library.
 */

export interface UspsClientConfig {
  consumerKey: string;
  consumerSecret: string;
  env: 'production' | 'development';
  originZipCode: string;
}

export interface AddressForValidation {
  streetAddress: string;
  secondaryAddress?: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface ValidatedAddress {
  streetAddress: string;
  secondaryAddress?: string;
  city: string;
  state: string;
  zipCode: string;
  zipCodePlus4?: string;
}

export interface RateRequestData {
  destinationZipCode: string;
  weightLbs: number;
  weightOz: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  enabledServices?: string[];
}

export interface Rate {
  serviceName: string;
  mailClass: string;
  price: number;
}

export interface LabelConfig {
  mid: string;
  crid: string;
  epsAccountNumber: string;
  fromAddress: {
    name: string;
    firm?: string;
    streetAddress: string;
    secondaryAddress?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
  };
  toAddress: {
    name: string;
    firm?: string;
    firstName?: string;
    lastName?: string;
    streetAddress: string;
    secondaryAddress?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    email?: string;
  };
  packageDetails: {
    contentType: string;
    contentDescription: string;
    destinationEntryFacilityType: string;
    mailClass: string;
    processingCategory: string;
    weight: number;
    length: number;
    width: number;
    height: number;
    unitOfMeasure: string;
    mailingDate: string;
    rateIndicator: string;
  };
}
