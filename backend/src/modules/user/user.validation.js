import { z } from 'zod';

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    bio: z.string().trim().max(200),
    email: z.string().trim().toLowerCase().email(),
    avatarUrl: z.string().max(2000000).nullable().optional(),
    gender: z.enum(['male', 'female', 'other']),
    dob: z.coerce.date().max(new Date(), 'Date of birth must be in the past'),
    city: z.string().trim().min(2).max(80),
    notificationPrefs: z
      .object({
        push: z.boolean().optional(),
        sms: z.boolean().optional(),
        email: z.boolean().optional(),
      })
      .strict(),
  })
  .partial()
  .strict();

export const fcmTokenSchema = z.object({
  token: z.string().min(20).max(512),
  // 'app' covers both Android and iOS — the native client doesn't need FCM
  // to distinguish them, so we don't ask it to.
  platform: z.enum(['web', 'app']).default('web'),
});

export const removeFcmTokenSchema = z.object({
  token: z.string().min(20).max(512),
});
