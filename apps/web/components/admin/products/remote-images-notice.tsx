"use client";

import { useState } from "react";
import { Alert, App, Button } from "antd";
import { CloudDownloadOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiProblem } from "@/lib/admin/api-client";
import { catalogueApi } from "@/lib/admin/catalogue-api";

/**
 * Warns while some product or category pictures are still links to KiotViet (an import that could not fetch them),
 * and lets a manager copy them onto this server. Hidden when every picture is already stored here.
 */
export function RemoteImagesNotice({ isManager }: { isManager: boolean }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  // under ["admin", "products"], so an import or edit refreshes the count too
  const remote = useQuery({
    queryKey: ["admin", "products", "remote-images"],
    queryFn: () => catalogueApi.remoteImageCount(),
  });
  const count = remote.data?.count ?? 0;
  if (count === 0) return null;

  async function copyAll() {
    setBusy(true);
    try {
      const report = await catalogueApi.localizeImages();
      if (report.failed === 0) {
        message.success(`Đã tải ${report.saved} ảnh về máy chủ.`);
      } else {
        message.warning(
          `Đã tải ${report.saved} ảnh. ${report.failed} ảnh chưa tải được, hãy thử lại sau.`,
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    } catch (error) {
      message.error(
        error instanceof ApiProblem
          ? error.message
          : "Không tải được ảnh về máy chủ.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Alert
      type="warning"
      showIcon
      style={{ marginBottom: 12 }}
      title={`Còn ${count} ảnh đang lấy trực tiếp từ KiotViet`}
      description="Nếu bên KiotViet xóa ảnh, ảnh trên web sẽ mất. Hãy tải các ảnh này về máy chủ của web."
      action={
        isManager ? (
          <Button
            size="small"
            type="primary"
            icon={<CloudDownloadOutlined />}
            loading={busy}
            onClick={() => void copyAll()}
          >
            Tải về máy chủ
          </Button>
        ) : undefined
      }
    />
  );
}
