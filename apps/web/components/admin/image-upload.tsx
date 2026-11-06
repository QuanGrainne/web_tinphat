"use client";

import { useRef, useState } from "react";
import { App, Button } from "antd";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { ApiProblem } from "@/lib/admin/api-client";
import { catalogueApi } from "@/lib/admin/catalogue-api";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

/** Form control for one image URL: pick a file, it uploads at once and the field holds the returned path. */
export function ImageUpload({ value, onChange }: { value?: string | null; onChange?: (url: string | null) => void }) {
  const { message } = App.useApp();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    if (file.size > MAX_BYTES) {
      message.error("Ảnh tối đa 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const { url } = await catalogueApi.uploadImage(file);
      onChange?.(url);
    } catch (error) {
      message.error(error instanceof ApiProblem ? error.message : "Không tải được ảnh lên.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div
        style={{
          height: 170,
          borderRadius: 6,
          background: "#F2EFE9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          color: "#57534E",
          fontSize: 13,
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded file
          <img src={value} alt="Ảnh đã chọn" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        ) : (
          "Chưa có ảnh"
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        style={{ display: "none" }}
        aria-label="Chọn ảnh"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Button icon={<UploadOutlined />} loading={uploading} onClick={() => input.current?.click()}>
          {value ? "Đổi ảnh" : "Tải ảnh lên"}
        </Button>
        {value && (
          <Button icon={<DeleteOutlined />} aria-label="Xóa ảnh" onClick={() => onChange?.(null)}>
            Xóa
          </Button>
        )}
      </div>
      <div style={{ marginTop: 6, color: "#57534E", fontSize: 12 }}>JPG, PNG hoặc WebP, tối đa 5 MB.</div>
    </div>
  );
}
