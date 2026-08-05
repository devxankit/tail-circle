import { z } from 'zod';

const addressFields = {
  label: z.enum(['home', 'work', 'other']).default('home'),
  fullName: z.string().trim().min(2).max(60),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number'),
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().max(120).optional().default(''),
  landmark: z.string().trim().max(80).optional().default(''),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit pincode'),
  isDefault: z.boolean().optional().default(false),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
};

export const createAddressSchema = z.object(addressFields).strict();

export const updateAddressSchema = z.object(addressFields).partial().strict();
