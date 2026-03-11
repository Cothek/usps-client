/**
 * @fileOverview USPS OAuth2 Authentication logic.
 */
import { UspsClientConfig } from './types';

export async function getUspsAccessToken(config: UspsClientConfig): Promise<string> {
  const { consumerKey, consumerSecret, isProduction } = config;

  if (!consumerKey || !consumerSecret) {
    throw new Error("USPS Consumer Key or Secret is missing from configuration.");
  }

  const uspsAuthBaseUrl = isProduction
    ? "https://apis.usps.com"
    : "https://apis-tem.usps.com";
  const uspsTokenEndpoint = `${uspsAuthBaseUrl}/oauth2/v3/token`;

  const tokenResponse = await fetch(uspsTokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: consumerKey,
      client_secret: consumerSecret,
      grant_type: "client_credentials",
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
    throw new Error("USPS OAuth token not found in response.");
  }
  return accessToken;
}
