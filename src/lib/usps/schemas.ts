import { z } from 'zod';

/**
 * Coerces inputs to numbers and ensures they are finite and positive.
 * This prevents NaN issues which JSON.stringify converts to 'null'.
 */
const CoercedPositiveNumber = z.coerce.number().finite().positive();
const CoercedNonNegativeNumber = z.coerce.number().finite().nonnegative();

/**
 * Valid USPS Processing Categories
 */
const ProcessingCategoryEnum = z.enum([
  'LETTERS', 
  'FLATS', 
  'MACHINABLE', 
  'NON_MACHINABLE', 
  'IRREGULAR'
]);

/**
 * Valid USPS Content Types
 */
const ContentTypeEnum = z.enum([
  'HAZMAT', 
  'CREMATED_REMAINS', 
  'LIVES', 
  'PERISHABLE', 
  'PHARMACEUTICALS', 
  'MEDICAL_SUPPLIES', 
  'FRAGILE', 
  'MERCHANDISE'
]);

export const UspsClientConfigSchema = z.object({
  consumerKey: z.string().min(1, "Consumer Key is required"),
  consumerSecret: z.string().min(1, "Consumer Secret is required"),
  env: z.enum(['production', 'development']),
  originZipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format"),
  mid: z.string().optional(),
  crid: z.string().optional(),
  epsAccountNumber: z.string().optional(),
});

export const AddressSchema = z.object({
  firstName: z.string().min(1, "First name is required if provided").optional(),
  lastName: z.string().min(1, "Last name is required if provided").optional(),
  firm: z.string().min(1, "Firm name is required if provided").optional(),
  streetAddress: z.string().min(1, "Street address is required").max(48, "Street address too long"),
  secondaryAddress: z.string().max(48, "Secondary address too long").optional(),
  city: z.string().min(1, "City is required").max(28, "City too long"),
  state: z.string().length(2, "State must be a 2-letter code"),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
}).refine(data => {
  // USPS Label API requires (firstName AND lastName) OR firm
  return (data.firstName && data.lastName) || data.firm;
}, {
  message: "Either (firstName AND lastName) or firm name must be provided",
  path: ["firstName"]
});

export const RateRequestSchema = z.object({
  destinationZipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid destination ZIP code"),
  weightLbs: CoercedNonNegativeNumber.default(0),
  weightOz: CoercedNonNegativeNumber.default(0),
  lengthIn: CoercedPositiveNumber,
  widthIn: CoercedPositiveNumber,
  heightIn: CoercedPositiveNumber,
  enabledServices: z.array(z.string()).optional(),
});

export const LabelConfigSchema = z.object({
  fromAddress: AddressSchema,
  toAddress: AddressSchema,
  packageDetails: z.object({
    contentType: ContentTypeEnum,
    contentDescription: z.string().min(1, "Content description is required").max(50),
    mailClass: z.string().min(1, "Mail class is required (e.g., 'PM' for Priority Mail)"),
    processingCategory: ProcessingCategoryEnum,
    weight: CoercedPositiveNumber,
    length: CoercedPositiveNumber,
    width: CoercedPositiveNumber,
    height: CoercedPositiveNumber,
    mailingDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Mailing date must be YYYY-MM-DD"),
  }),
});
