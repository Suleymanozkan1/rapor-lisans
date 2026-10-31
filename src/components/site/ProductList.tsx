import type { Product } from '@/lib/types'
import { serverLookup } from './server-lookup'
import { ProductArtView, ProductListView, ProductMediaView } from './views/products'

/**
 * Cover art in the style of the Güvenli Çalış posts (yellow slanted panel on
 * black, logo, serif title) for products that have no cover image.
 */
export function ProductArt(props: { title: string; large?: boolean }) {
  return <ProductArtView {...props} lookup={serverLookup()} />
}

export function ProductMedia(props: { product: Product; large?: boolean }) {
  return <ProductMediaView {...props} lookup={serverLookup()} />
}

/** `fan`: on the home page the covers start as a fanned deck and spread into the row as the shelf scrolls into view. */
export function ProductList(props: { products: Product[]; headingLevel?: 2 | 3; fan?: boolean }) {
  return <ProductListView {...props} lookup={serverLookup()} />
}
