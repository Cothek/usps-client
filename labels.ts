/**
 * @fileOverview USPS Label Creation logic.
 */
import { PDFDocument } from 'pdf-lib';
import { LabelConfig } from './types';

export async function createLabel(params: {
  accessToken: string;
  isProduction: boolean;
  config: LabelConfig;
}) {
  const { accessToken, isProduction, config } = params;
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
  const labelEndpoint = `${uspsApiBaseUrl}/labels/v3/label`;
  const labelBody = {
    requester: { requesterId: config.mid, mailingActivity: 'PERMIT_HOLDER_OR_END_USER' },
    fromAddress: config.fromAddress,
    toAddress: config.toAddress,
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
