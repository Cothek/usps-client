/**
 * @fileOverview Type definitions for the USPS client library.
 */

export type ContentType = 
  | 'HAZMAT' 
  | 'CREMATED_REMAINS' 
  | 'LIVES' 
  | 'PERISHABLE' 
  | 'PHARMACEUTICALS' 
  | 'MEDICAL_SUPPLIES' 
  | 'FRAGILE' 
  | 'MERCHANDISE';

export type ProcessingCategory = 
  | 'LETTERS' 
  | 'FLATS' 
  | 'MACHINABLE' 
  | 'NON_MACHINABLE' 
  | 'IRREGULAR';

export interface UspsClientConfig {
  consumerKey: string;
  consumerSecret: string;
  env: 'production' | 'development';
  originZipCode: string;
  mid?: string;
  crid?: string;
  epsAccountNumber?: string;
}

export interface AddressForValidation {
  firstName?: string;
  lastName?: string;
  firm?: string;
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
  zip5: string;
  zip4?: string;
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
  fromAddress: AddressForValidation;
  toAddress: AddressForValidation;
  packageDetails: {
    contentType: ContentType;
    contentDescription: string;
    mailClass: string;
    processingCategory: ProcessingCategory;
    weight: number;
    length: number;
    width: number;
    height: number;
    mailingDate: string;
  };
}
