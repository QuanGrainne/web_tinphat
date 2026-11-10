"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

const arrow: CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: 48,
  height: 72,
  border: 0,
  background: "rgba(255,255,255,.08)",
  color: "#fff",
  fontSize: 28,
  cursor: "pointer",
};

/** Full-screen photo viewer: counter, previous/next, thumbnails. Esc or a click outside the photo closes it. */
export function ImageLightbox({ images, start = 0, onClose }: { images: string[]; start?: number; onClose: () => void }) {
  const [index, setIndex] = useState(start);
  const many = images.length > 1;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // the viewer can sit on top of the product form, which must stay open with its unsaved edits
        event.stopPropagation();
        onClose();
      }
      if (event.key === "ArrowRight") setIndex((i) => (i + 1) % images.length);
      if (event.key === "ArrowLeft") setIndex((i) => (i - 1 + images.length) % images.length);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey, true);
    };
  }, [images.length, onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
      className="tp-lb"
      style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", flexDirection: "column", background: "rgba(20,20,20,.96)", color: "#fff" }}
    >
      <style>{`
        .tp-lb{animation:tp-lb-in .2s cubic-bezier(.22,1,.36,1)}
        .tp-lb-img{animation:tp-lb-img .25s cubic-bezier(.22,1,.36,1)}
        .tp-lb button{transition:background-color .15s,border-color .15s,transform .15s}
        .tp-lb button:active{transform:scale(.96)}
        @keyframes tp-lb-in{from{opacity:0}}
        @keyframes tp-lb-img{from{opacity:0;transform:scale(.97)}}
        @media (prefers-reduced-motion:reduce){.tp-lb,.tp-lb-img{animation:none}}
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", fontSize: 15 }}>
        <span>
          {index + 1} / {images.length}
        </span>
        <button type="button" aria-label="Đóng" onClick={onClose} style={{ border: 0, background: "none", color: "#fff", fontSize: 28, lineHeight: 1, cursor: "pointer" }}>
          ×
        </button>
      </div>
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- full-size view of an uploaded or linked photo */}
        <img
          key={index}
          className="tp-lb-img"
          src={images[index]}
          alt={`Ảnh ${index + 1}`}
          onClick={(event) => event.stopPropagation()}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />
        {many && (
          <>
            <button
              type="button"
              aria-label="Ảnh trước"
              onClick={(event) => {
                event.stopPropagation();
                setIndex((i) => (i - 1 + images.length) % images.length);
              }}
              style={{ ...arrow, left: 0 }}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Ảnh sau"
              onClick={(event) => {
                event.stopPropagation();
                setIndex((i) => (i + 1) % images.length);
              }}
              style={{ ...arrow, right: 0 }}
            >
              ›
            </button>
          </>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: 12, background: "rgba(255,255,255,.08)" }}>
        {images.map((url, i) => (
          <button
            key={url}
            type="button"
            aria-label={`Chọn ảnh ${i + 1}`}
            aria-pressed={i === index}
            onClick={(event) => {
              event.stopPropagation();
              setIndex(i);
            }}
            style={{ width: 64, height: 64, padding: 0, overflow: "hidden", background: "none", border: `2px solid ${i === index ? "#fff" : "transparent"}`, borderRadius: 6, cursor: "pointer" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail of the same photo */}
            <img src={url} alt="" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
