import Image, { type ImageProps } from "next/image";

/** Hosts whose photos the image optimiser may fetch; anything else is shown as stored. */
const OPTIMISED_HOST = /^https:\/\/[a-z0-9-]+\.kiotviet\.vn\//i;

export function canOptimise(src: string): boolean {
  return src.startsWith("/") || OPTIMISED_HOST.test(src);
}

/**
 * Product and category photo. Uploads and KiotViet photos go through the Next image optimiser, which resizes them to
 * the slot (sizes) and serves WebP; a link to another site is shown as it is, because the optimiser refuses unknown hosts.
 */
export function CatalogImage({ src, alt = "", ...props }: Omit<ImageProps, "src" | "alt"> & { src: string; alt?: string }) {
  return <Image src={src} alt={alt} unoptimized={!canOptimise(src)} {...props} />;
}
