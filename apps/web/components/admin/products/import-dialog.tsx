"use client";

import { useRef, useState } from "react";
import {
  Alert,
  App,
  Button,
  Checkbox,
  Modal,
  Table,
  Tag,
  TreeSelect,
} from "antd";
import type { TableColumnsType } from "antd";
import { FileExcelOutlined } from "@ant-design/icons";
import { ApiProblem } from "@/lib/admin/api-client";
import {
  catalogueApi,
  type ImportPreview,
  type ImportPreviewRow,
  type ImportResult,
} from "@/lib/admin/catalogue-api";
import { useCategories } from "@/lib/admin/catalogue-queries";
import { formatNumber } from "@/lib/format/money";
import type { AdminCategory } from "@/lib/api/types";

const ACTIONS: Record<
  ImportPreviewRow["action"],
  { label: string; color: string }
> = {
  CREATE: { label: "Tạo mới", color: "green" },
  UPDATE: { label: "Cập nhật", color: "blue" },
  SKIP: { label: "Bỏ qua", color: "default" },
  ERROR: { label: "Lỗi", color: "red" },
};

const FROM_FILE = 0;

function toNodes(
  list: AdminCategory[],
): { value: number; title: string; children: ReturnType<typeof toNodes> }[] {
  return list.map((c) => ({
    value: c.id,
    title: c.name,
    children: toNodes(c.children),
  }));
}

const columns: TableColumnsType<ImportPreviewRow> = [
  {
    title: "Ảnh",
    dataIndex: "imageUrl",
    width: 60,
    render: (url: string | null) =>
      url ? (
        // eslint-disable-next-line @next/next/no-img-element -- small preview of a link from the file
        <img
          src={url}
          alt=""
          width={40}
          height={40}
          loading="lazy"
          style={{ objectFit: "cover", borderRadius: 4, display: "block" }}
        />
      ) : (
        "-"
      ),
  },
  { title: "Mã hàng", dataIndex: "code", width: 110 },
  { title: "Tên sản phẩm", dataIndex: "name" },
  {
    title: "Danh mục",
    dataIndex: "category",
    width: 130,
    render: (v: string) => v || "-",
  },
  {
    title: "Giá",
    dataIndex: "price",
    align: "right",
    width: 100,
    render: (v: number | null) => (v === null ? "Liên hệ" : formatNumber(v)),
  },
  {
    title: "Kết quả",
    dataIndex: "action",
    width: 190,
    render: (action: ImportPreviewRow["action"], row) => (
      <>
        <Tag color={ACTIONS[action].color}>{ACTIONS[action].label}</Tag>
        {row.message && (
          <div style={{ fontSize: 12, marginTop: 2 }}>{row.message}</div>
        )}
      </>
    ),
  },
];

/** Import from Excel: choose the file and the target category, check the preview, then import. */
export function ImportDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const { message } = App.useApp();
  const categories = useCategories();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState<number>(FROM_FILE);
  const [publish, setPublish] = useState(true);
  const [update, setUpdate] = useState(true);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const target = categoryId === FROM_FILE ? null : categoryId;

  async function loadPreview(nextFile: File, nextCategory: number | null) {
    setBusy(true);
    setResult(null);
    try {
      setPreview(await catalogueApi.previewImport(nextFile, nextCategory));
    } catch (error) {
      setPreview(null);
      message.error(
        error instanceof ApiProblem ? error.message : "Không đọc được file.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    if (!file) return;
    setBusy(true);
    try {
      const done = await catalogueApi.runImport(file, {
        categoryId: target,
        publish,
        update,
      });
      setResult(done);
      setPreview(null);
      onImported();
    } catch (error) {
      message.error(
        error instanceof ApiProblem
          ? error.message
          : "Import không thành công.",
      );
    } finally {
      setBusy(false);
    }
  }

  const ready =
    preview !== null && preview.create + (update ? preview.update : 0) > 0;

  return (
    <Modal
      open
      title="Import sản phẩm từ Excel"
      width={980}
      centered
      destroyOnHidden
      mask={{ closable: false }}
      onCancel={onClose}
      footer={
        result ? (
          <Button type="primary" onClick={onClose}>
            Xong
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>Bỏ qua</Button>
            <Button
              type="primary"
              disabled={!ready}
              loading={busy}
              onClick={() => void runImport()}
            >
              Import{" "}
              {preview ? preview.create + (update ? preview.update : 0) : 0} sản
              phẩm
            </Button>
          </>
        )
      }
    >
      {result ? (
        <>
          <Alert
            type={result.errors.length > 0 ? "warning" : "success"}
            showIcon
            title={`Đã tạo ${result.created}, cập nhật ${result.updated}, bỏ qua ${result.skipped}, lỗi ${result.errors.length}.`}
          />
          {result.imagesSaved + result.imagesLinked > 0 && (
            <Alert
              style={{ marginTop: 12 }}
              type={result.imagesLinked > 0 ? "warning" : "info"}
              showIcon
              title={
                result.imagesLinked > 0
                  ? `Đã lưu ${result.imagesSaved} ảnh về máy chủ. ${result.imagesLinked} ảnh chưa tải được, vẫn đang lấy từ KiotViet.`
                  : `Đã lưu ${result.imagesSaved} ảnh về máy chủ của web.`
              }
              description={
                result.imagesLinked > 0
                  ? 'Bấm "Tải về máy chủ" ở danh sách hàng hóa để thử lại.'
                  : undefined
              }
            />
          )}
          {result.errors.length > 0 && (
            <ul style={{ marginTop: 12 }}>
              {result.errors.map((e) => (
                <li key={e.row}>
                  Dòng {e.row} {e.code && `(${e.code})`}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
            }}
          >
            <input
              ref={input}
              type="file"
              accept=".xlsx"
              style={{ display: "none" }}
              aria-label="Chọn file Excel"
              onChange={(event) => {
                const chosen = event.target.files?.[0];
                event.target.value = "";
                if (chosen) {
                  setFile(chosen);
                  void loadPreview(chosen, target);
                }
              }}
            />
            <Button
              icon={<FileExcelOutlined />}
              loading={busy}
              onClick={() => input.current?.click()}
            >
              {file ? "Đổi file" : "Chọn file Excel"}
            </Button>
            {file && <span>{file.name}</span>}
            <TreeSelect
              style={{ width: 280 }}
              aria-label="Danh mục import vào"
              treeDefaultExpandAll
              value={categoryId}
              treeData={[
                {
                  value: FROM_FILE,
                  title: "Theo nhóm hàng trong file",
                  children: [],
                },
                ...toNodes(categories.data ?? []),
              ]}
              onChange={(value: number) => {
                setCategoryId(value);
                if (file)
                  void loadPreview(file, value === FROM_FILE ? null : value);
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 20,
              marginTop: 12,
            }}
          >
            <Checkbox
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
            >
              Hiển thị trên web ngay
            </Checkbox>
            <Checkbox
              checked={update}
              onChange={(e) => setUpdate(e.target.checked)}
            >
              Cập nhật sản phẩm đã có (cùng mã hàng)
            </Checkbox>
          </div>
          {preview ? (
            <>
              <p style={{ margin: "12px 0 8px" }}>
                <b>{preview.create}</b> tạo mới, <b>{preview.update}</b> cập
                nhật, <b>{preview.skip}</b> bỏ qua, <b>{preview.error}</b> lỗi.
              </p>
              <Table<ImportPreviewRow>
                rowKey="row"
                size="small"
                columns={columns}
                dataSource={preview.rows}
                pagination={false}
                scroll={{ y: 380 }}
              />
            </>
          ) : (
            <p style={{ margin: "16px 0 0", color: "#57534E" }}>
              Dùng file xuất từ KiotViet (Hàng hóa, Xuất file) hoặc file xuất từ
              trang này. Mỗi dòng thành một sản phẩm. Giá 0 sẽ hiện Liên hệ. Nếu
              sản phẩm đã có giá trên web mà file để 0, giá trên web được giữ
              nguyên.
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
