import type { ImageRef, Post } from '@/lib/types'

/**
 * What the site's view components need beyond their props. On the server it
 * comes from the content files; in the page editor (browser) from the data
 * the editor loaded, so the same views render in both places.
 */
export type SiteLookup = {
  /** Intrinsic size of a library image, for width/height attributes. */
  dims(src: string): { width?: number; height?: number } | undefined
  /** Site logo, drawn on product covers without a photo. */
  logo?: ImageRef
  /** Reading time of a post in minutes. */
  minutes(post: Post): number
}
