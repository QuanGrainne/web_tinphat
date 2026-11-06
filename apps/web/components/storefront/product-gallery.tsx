"use client";

import { useState } from "react";
import { ImageLightbox } from "@/components/image-lightbox";

/** Product page photos: one large image and, when there are several, thumbnails that switch it. */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const current = images[active] ?? images[0];
  return (
    <div className="gal">
      <div className="ph main">
        {current ? (
          <button type="button" className="tp-zoom" aria-label={`Phóng to ảnh ${name}`} onClick={() => setZoomed(true)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- plain img by design: no image optimiser on the small VPS */}
            <img src={current} alt={name} width={1200} height={1200} fetchPriority="high" decoding="async" />
          </button>
        ) : (
          <i className="i i-image" aria-hidden="true" />
        )}
      </div>
      {images.length > 1 && (
        <div className="tp-thumbs">
          {images.map((url, index) => (
            <button key={url} type="button" className={index === active ? "on" : undefined} aria-label={`Xem ảnh ${index + 1}`} aria-pressed={index === active} onClick={() => setActive(index)}>
              {/* eslint-disable-next-line @next/next/no-img-element -- plain img by design: no image optimiser on the small VPS */}
              <img src={url} alt="" width={120} height={120} loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
      {zoomed && <ImageLightbox images={images} start={active} onClose={() => setZoomed(false)} />}
    </div>
  );
}
