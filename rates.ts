/**
 * @fileOverview USPS Rate Calculation logic.
 */
import { Rate, RateRequestData } from "./types";
import { serviceFilterMap } from "./constants";

export async function getRates(params: {
  request: RateRequestData;
  originZip: string;
  accessToken: string;
  isProduction: boolean;
}) {
  const { request, originZip, accessToken, isProduction } = params;
  const uspsApiBaseUrl = isProduction ? 'https://apis.usps.com' : 'https://apis-tem.usps.com';
  const apiUrl = `${uspsApiBaseUrl}/prices/v3/base-rates-list/search`;

  const requestBody = {
    originZIPCode: originZip.split('-')[0],
    destinationZIPCode: request.destinationZip.split('-')[0],
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
