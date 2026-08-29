/** Runtime config. The gateway base URL is overridable per environment. */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3008';

export const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? 'SBAZWIDE';

/**
 * Storefront Product Card & PDP Gallery Aspect Ratio Configuration.
 * 'square' (1:1 aspect ratio) or 'vertical' (3:4 portrait aspect ratio).
 * Set via NEXT_PUBLIC_PRODUCT_CARD_RATIO environment variable (e.g. NEXT_PUBLIC_PRODUCT_CARD_RATIO=square).
 */
export const PRODUCT_CARD_RATIO: 'square' | 'vertical' =
  process.env.NEXT_PUBLIC_PRODUCT_CARD_RATIO === 'square' ? 'square' : 'vertical';

export const CARD_ASPECT_CLASS =
  PRODUCT_CARD_RATIO === 'square' ? 'aspect-square' : 'aspect-[3/4]';
