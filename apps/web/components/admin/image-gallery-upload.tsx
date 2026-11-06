"use client";

import { useRef, useState } from "react";
import { App, Button } from "antd";
import { CloseOutlined, StarOutlined, UploadOutlined } from "@ant-design/icons";
import { ImageLightbox } from "@/components/image-lightbox";
import { ApiProblem } from "@/lib/admin/api-client";
import { catalogueApi } from "@/lib/admin/catalogue-api";

const MAX_IMAGES = 5;
const MAX_BYTES = 5 * 1024 * 1024;

/** Form control for up to five product images. The first one is the cover shown on the product cards. */
export function ImageGalleryUpload({ value = [], onChange }: { value?: string[]; onChange?: (urls: string[]) => void }) {
  const { message } = App.useApp();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const left = MAX_IMAGES - value.length;

  async function upload(files: File[]) {
    if (files.length > left) message.warning(`Mỗi sản phẩm tối đa ${MAX_IMAGES} ảnh, chỉ tải thêm ${left} ảnh đầu.`);
    const urls = [...value];
    setUploading(true);
    for (const file of files.slice(0, left)) {
      if (file.size > MAX_BYTES) {
        message.error(`${file.name}: ảnh tối đa 5 MB.`);
        continue;
      }
      try {
        urls.push((await catalogueApi.uploadImage(file)).url);
      } catch (error) {
        message.error(error instanceof ApiProblem ? `${file.name}: ${error.message}` : `Không tải được ${file.name}.`);
      }
    }
    setUploading(false);
    onChange?.(urls);
  }

  return (
    <div>
      {value.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {value.map((url, index) => (
            <div key={url} style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 6, overflow: "hidden", background: "#F2EFE9" }}>
              <button
                type="button"
                title="Xem ảnh lớn"
                aria-label={`Xem lớn ảnh ${index + 1}`}
                onClick={() => setViewing(index)}
                style={{ display: "block", width: "100%", height: "100%", padding: 0, border: 0, background: "none", cursor: "zoom-in" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded file */}
                <img src={url} alt="Ảnh đã chọn" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
              {index === 0 && (
                <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "1px 0", background: "rgba(28,25,23,.75)", color: "#fff", fontSize: 10, textAlign: "center" }}>
                  Đại diện
                </span>
              )}
              {index > 0 && (
                <Button
                  size="small"
                  shape="circle"
                  title="Đặt làm ảnh đại diện"
                  icon={<StarOutlined style={{ fontSize: 10 }} />}
                  aria-label={`Đặt ảnh ${index + 1} làm ảnh đại diện`}
                  onClick={() => onChange?.([url, ...value.filter((other) => other !== url)])}
                  style={{ position: "absolute", top: 3, left: 3, width: 20, minWidth: 20, height: 20 }}
                />
              )}
              <Button
                size="small"
                shape="circle"
                icon={<CloseOutlined style={{ fontSize: 10 }} />}
                aria-label={`Xóa ảnh ${index + 1}`}
                onClick={() => onChange?.(value.filter((other) => other !== url))}
                style={{ position: "absolute", top: 3, right: 3, width: 20, minWidth: 20, height: 20 }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ height: 120, display: "grid", placeItems: "center", borderRadius: 6, background: "#F2EFE9", color: "#57534E", fontSize: 13 }}>Chưa có ảnh</div>
      )}
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        aria-label="Chọn ảnh sản phẩm"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) void upload(files);
        }}
      />
      <Button icon={<UploadOutlined />} loading={uploading} disabled={left <= 0} onClick={() => input.current?.click()} style={{ marginTop: 8 }}>
        Tải ảnh lên ({value.length}/{MAX_IMAGES})
      </Button>
      <div style={{ marginTop: 6, color: "#57534E", fontSize: 12 }}>Bấm ảnh để xem lớn. Bấm dấu sao để đặt làm ảnh đại diện.</div>
      {viewing !== null && <ImageLightbox images={value} start={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
