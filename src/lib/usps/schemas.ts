import { z } from 'zod';

/**
 * Coerces inputs to numbers and ensures they are finite and positive.
 * This prevents NaN issues which JSON.stringify converts to 'null'.
 */
const CoercedPositiveNumber = z.coerce.number().finite().positive();
const CoercedNonNegativeNumber = z.coerce.number().finite().nonnegative();

export const UspsClientConfigSchema = z.object({
  consumerKey: z.string().min(1, "Consumer Key is required"),
  consumerSecret: z.string().min(1, "Consumer Secret is required"),
  env: z.enum(['production', 'development']),
  originZipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format"),
  // Account level credentials are now optional at the client level
  mid: z.string().optional(),
  crid: z.string().optional(),
  epsAccountNumber: z.string().optional(),
});

export const AddressSchema = z.object({
  name: z.string().optional(),
  firm: z.string().optional(),
  streetAddress: z.string().min(1, "Street address is required"),
  secondaryAddress: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().length(2, "State must be a 2-letter code"),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
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
  mid: z.string().optional(),
  crid: z.string().optional(),
  epsAccountNumber: z.string().optional(),
  fromAddress: AddressSchema,
  toAddress: AddressSchema,
  packageDetails: z.object({
    contentType: z.string().default('MERCHANDISE'),
    contentDescription: z.string().default('Shipping Package'),
    mailClass: z.string().min(1, "Mail class is required (e.g., 'PM' for Priority Mail)"),
    processingCategory: z.string().default('MACHINABLE'),
    weight: CoercedPositiveNumber,
    length: CoercedPositiveNumber,
    width: CoercedPositiveNumber,
    height: CoercedPositiveNumber,
    mailingDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Mailing date must be YYYY-MM-DD")
      .default(() => new Date().toISOString().split('T')[0]),
  }),
});
