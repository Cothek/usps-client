/**
 * @fileOverview USPS Address Validation logic.
 */
import { AddressForValidation, ValidatedAddress } from './types';

export async function validateAddress(params: {
  address: AddressForValidation;
  accessToken: string;
  isProduction: boolean;
}) {
  const { address, accessToken, isProduction } = params;
  const uspsApiBaseUrl = isProduction ? "https://apis.usps.com" : "https://apis-tem.usps.com";
  const validationEndpoint = `${uspsApiBaseUrl}/addresses/v3/address`;

  const queryParams: Record<string, string> = {
    streetAddress: address.streetAddress,
    city: address.city,
    state: address.state,
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
