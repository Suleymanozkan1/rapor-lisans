import { z } from 'zod'
import { localAssetPath } from './types'

export const mediaItemSchema = z.object({
  src: localAssetPath,
  alt: z.string().min(1).max(300),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().nonnegative(),
  uploadedAt: z.string(),
})
export const mediaIndexSchema = z.array(mediaItemSchema)
export type MediaItem = z.infer<typeof mediaItemSchema>
