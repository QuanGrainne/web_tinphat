"use client";

import { Button, Checkbox, DatePicker, Form, Input, InputNumber, Select, Switch, Table } from "antd";
import type { TableColumnsType } from "antd";
import type { FormListFieldData } from "antd/es/form/FormList";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { formatNumber } from "@/lib/format/money";
import { newSkuRow, type SkuFormRow } from "@/lib/admin/catalogue-form";
import { formatSignedPct, perBaseUnit, type PriceMismatchWarning } from "@/lib/admin/pricing-display";
import styles from "./products.module.css";

const DATE_DISPLAY = "DD/MM/YYYY";

const moneyFormatter = (value: number | string | undefined) =>
  value === undefined || value === null || value === "" ? "" : formatNumber(Number(value));
// An empty string must stay empty so clearing the box yields null (no price), never 0; the cast is
// needed only because the parser type says number while the component accepts numeric strings.
const moneyParser = (value: string | undefined) => (value ?? "").replace(/\D/g, "") as unknown as number;

const PRICE_VISIBLE_OPTIONS = [
  { value: true, label: "Hiện giá" },
  { value: false, label: "Liên hệ" },
];

/**
 * Editable "Quy cách & giá" table (Form.List `skus`). Existing rows cannot be removed and the base row is fixed
 * at conversion 1; callers that may not edit prices get every price/flag/code control disabled.
 */
export function SkuPriceTable({
  rows,
  canEditPrice,
  warnings,
}: {
  /** Live form values of the list (for the computed column). */
  rows: SkuFormRow[];
  canEditPrice: boolean;
  warnings: PriceMismatchWarning[];
}) {
  const warningByRow = new Map(warnings.map((w) => [w.index, w]));
  const lockPrice = !canEditPrice;

  const columns: TableColumnsType<FormListFieldData> = [
    {
      title: "Đơn vị",
      width: 80,
      render: (_, field) => (
        <Form.Item name={[field.name, "unitName"]} rules={[{ required: true, whitespace: true, message: "Nhập đơn vị" }]}>
          <Input placeholder="Gói" maxLength={40} />
        </Form.Item>
      ),
    },
    {
      title: "Quy đổi (gói)",
      width: 76,
      render: (_, field) => {
        const isBase = rows[field.name]?.isBase ?? false;
        return (
          <Form.Item
            name={[field.name, "conversion"]}
            rules={[{ required: true, type: "integer", min: 1, message: "Số nguyên ≥ 1" }]}
          >
            <InputNumber min={1} max={100000} precision={0} controls={false} disabled={isBase || lockPrice} style={{ width: "100%" }} />
          </Form.Item>
        );
      },
    },
    {
      title: "Mã hàng",
      width: 140,
      render: (_, field) => (
        <Form.Item
          name={[field.name, "code"]}
          rules={[
            { required: true, whitespace: true, message: "Nhập mã hàng" },
            ({ getFieldValue }) => ({
              validator(_rule, value: string | undefined) {
                const mine = (value ?? "").trim().toLowerCase();
                if (!mine) return Promise.resolve();
                const all = (getFieldValue("skus") as SkuFormRow[] | undefined) ?? [];
                const clashes = all.filter((r, i) => i !== field.name && (r.code ?? "").trim().toLowerCase() === mine);
                return clashes.length > 0 ? Promise.reject(new Error("Mã hàng bị trùng")) : Promise.resolve();
              },
            }),
          ]}
        >
          <Input className={styles.mono} maxLength={80} disabled={lockPrice} />
        </Form.Item>
      ),
    },
    {
      title: "Giá đã gồm VAT",
      width: 112,
      align: "right",
      render: (_, field) => (
        <Form.Item name={[field.name, "price"]}>
          <InputNumber
            min={0}
            precision={0}
            controls={false}
            formatter={moneyFormatter}
            parser={moneyParser}
            disabled={lockPrice}
            status={warningByRow.has(field.name) ? "warning" : undefined}
            className={styles.moneyInput}
            style={{ width: "100%" }}
          />
        </Form.Item>
      ),
    },
    {
      title: "Đơn giá/gói",
      width: 76,
      align: "right",
      render: (_, field) => {
        const row = rows[field.name];
        const value = perBaseUnit(row?.price, row?.conversion);
        const warning = warningByRow.get(field.name);
        return (
          <div className={styles.computed} style={warning ? { color: "#B45309" } : undefined}>
            {value === null ? "-" : formatNumber(value)}
            {warning && <div className={`${styles.sub} ${styles.subWarn}`}>{formatSignedPct(warning.deviationPct)}</div>}
          </div>
        );
      },
    },
    {
      title: "Giá khuyến mại và ngày áp dụng",
      render: (_, field) => (
        <div className={styles.promoRow}>
          <Form.Item
            name={[field.name, "promoPrice"]}
            dependencies={[["skus", field.name, "price"]]}
            rules={[
              ({ getFieldValue }) => ({
                validator(_rule, value: number | null | undefined) {
                  const price = getFieldValue(["skus", field.name, "price"]) as number | null | undefined;
                  return value != null && price != null && value >= price
                    ? Promise.reject(new Error("Giá KM phải thấp hơn giá thường"))
                    : Promise.resolve();
                },
              }),
            ]}
          >
            <InputNumber min={0} precision={0} controls={false} placeholder="Giá KM" formatter={moneyFormatter} parser={moneyParser} className={styles.moneyInput} disabled={lockPrice} style={{ width: 80 }} />
          </Form.Item>
          <Form.Item name={[field.name, "promoFrom"]}>
            <DatePicker format={DATE_DISPLAY} placeholder="Từ ngày" disabled={lockPrice} suffixIcon={null} style={{ width: 96 }} />
          </Form.Item>
          <Form.Item
            name={[field.name, "promoTo"]}
            dependencies={[["skus", field.name, "promoFrom"]]}
            rules={[
              ({ getFieldValue }) => ({
                validator(_rule, value: SkuFormRow["promoTo"]) {
                  const from = getFieldValue(["skus", field.name, "promoFrom"]) as SkuFormRow["promoFrom"];
                  return value && from && value.isBefore(from, "day")
                    ? Promise.reject(new Error("Đến ngày phải sau từ ngày"))
                    : Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker format={DATE_DISPLAY} placeholder="Đến ngày" disabled={lockPrice} suffixIcon={null} style={{ width: 96 }} />
          </Form.Item>
        </div>
      ),
    },
    {
      title: "Hiển thị giá",
      width: 132,
      render: (_, field) => (
        <>
          <Form.Item name={[field.name, "priceVisible"]}>
            <Select options={PRICE_VISIBLE_OPTIONS} disabled={lockPrice} />
          </Form.Item>
          <Form.Item name={[field.name, "needsConfirmation"]} valuePropName="checked" style={{ marginTop: 4 }}>
            <Checkbox disabled={lockPrice}>
              <span style={{ fontSize: 11.5, color: rows[field.name]?.needsConfirmation ? "#B45309" : undefined, fontWeight: rows[field.name]?.needsConfirmation ? 600 : undefined }}>
                Cần xác nhận quy cách
              </span>
            </Checkbox>
          </Form.Item>
        </>
      ),
    },
    {
      title: "Hiện",
      width: 52,
      align: "center",
      render: (_, field) => (
        <Form.Item name={[field.name, "visible"]} valuePropName="checked">
          <Switch size="small" />
        </Form.Item>
      ),
    },
  ];

  return (
    <Form.List name="skus">
      {(fields, { add, remove }) => (
        <>
          <Table<FormListFieldData>
            className={styles.skuTable}
            size="small"
            scroll={{ x: "max-content" }}
            pagination={false}
            rowKey="key"
            dataSource={fields}
            columns={[
              ...columns,
              {
                title: "",
                width: 36,
                render: (_, field) => {
                  const row = rows[field.name];
                  // Only rows that were never saved can be removed.
                  const removable = canEditPrice && !!row && row.id === null && !row.isBase;
                  return removable ? (
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label="Xóa quy cách" onClick={() => remove(field.name)} />
                  ) : null;
                },
              },
            ]}
          />
          {canEditPrice && (
            <Button type="link" icon={<PlusOutlined />} style={{ paddingLeft: 0, marginTop: 8 }} onClick={() => add(newSkuRow(false))}>
              Thêm quy cách
            </Button>
          )}
        </>
      )}
    </Form.List>
  );
}
