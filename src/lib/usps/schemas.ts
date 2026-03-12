import { z } from 'zod';

export const UspsClientConfigSchema = z.object({
  consumerKey: z.string().min(1, "Consumer Key is required"),
  consumerSecret: z.string().min(1, "Consumer Secret is required"),
  env: z.enum(['production', 'development']),
  originZipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format"),
});

export const AddressSchema = z.object({
  name: z.string().optional(),
  streetAddress: z.string().min(1),
  secondaryAddress: z.string().optional(),
  city: z.string().min(1),
  state: z.string().length(2),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
});

export const RateRequestSchema = z.object({
  destinationZipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  weightLbs: z.number().nonnegative(),
  weightOz: z.number().nonnegative().default(0),
  lengthIn: z.number().positive(),
  widthIn: z.number().positive(),
  heightIn: z.number().positive(),
  enabledServices: z.array(z.string()).optional(),
});

export const LabelConfigSchema = z.object({
  mid: z.string(),
  crid: z.string(),
  epsAccountNumber: z.string(),
  fromAddress: AddressSchema,
  toAddress: AddressSchema,
  packageDetails: z.object({
    contentType: z.string(),
    contentDescription: z.string(),
    mailClass: z.string(),
    processingCategory: z.string().default('MACHINABLE'),
    weight: z.number().positive(),
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
    mailingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
});
