// Generated from docs/api-contract-mvp.md. Edit the contract, then regenerate (lead). Do not hand-edit.

export interface ProblemBody {
  type?: string; title?: string; status: number; detail: string; instance?: string;
  code: string; errors?: { field: string; message: string }[];
  [extension: string]: unknown;
}
export interface Page<T> { items: T[]; page: number; pageSize: number; total: number }
export interface Crumb { name: string; href: string }
export type SavingKind = "PERCENT" | "EQUAL" | "NONE";

export type Role = "EDITOR" | "MANAGER";
export interface AdminSession { username: string; displayName: string; role: Role }
export interface CompanyInfo { name: string; taxCode: string; address: string; warehouse: string; phone: string; email: string }
export interface BankInfo { bankName: string; bin: string; accountNo: string; accountName: string }
/** zalo, facebook, whatsapp and wechat are null when not set. */
export interface PublicSettings { company: CompanyInfo; hotline: string; zalo: string | null; facebook: string | null; whatsapp: string | null; wechat: string | null; trustStrip: string[] }
/**
 * Contact details the admin edits (/admin/contact): zalo is a number or a zalo.me link, whatsapp a number or a wa.me
 * link, wechat a WeChat ID or number; the four social fields may be "".
 */
export interface ContactSettings { hotline: string; zalo: string; facebook: string; whatsapp: string; wechat: string; email: string; address: string }
export interface AdminSettings {
  company: CompanyInfo; bank: BankInfo; notifyOwnerEmail: string;
  pricingMismatchThresholdPct: number; discountTiers: { threshold: number; pct: number }[];
}
export interface BankSettingsUpdate extends BankInfo { currentPassword: string }

export interface PublicSku {
  id: number; code: string; unitName: string; conversion: number; isBase: boolean;
  priceVisible: boolean;                    // false => show "Liên hệ"; all price fields below are null
  price: number | null;                     // regular price
  effectivePrice: number | null;            // promo price while the promo is active, else price
  promoActive: boolean; promoPrice: number | null; promoTo: string | null;
  perBaseUnit: number | null;               // round(effectivePrice / conversion), HALF_UP
  saving: { kind: SavingKind; pct: number | null };
  // saving vs base unit: pct=(baseEff*conv-packEff)/(baseEff*conv)*100 (1 decimal).
  // PERCENT if pct>=0.1; EQUAL ("Bằng giá mua lẻ") if pct>=0 and rounds to 0.0; NONE if negative, base unit, hidden, or base price missing/0
}
export interface ProductCard {
  id: number; slug: string; name: string; brand: { name: string; slug: string } | null;
  imageUrl: string | null; specLine: string | null;
  fromPrice: number | null;                 // lowest effective per-base-unit price among visible-priced SKUs; null => "Liên hệ"
  fromUnitName: string | null;              // base unit name
  hasMultipleUnits: boolean;                // true => "Từ 8.570đ / gói"
  units: { name: string; priceVisible: boolean }[];
  discontinued: boolean;                    // shown on the site by choice, but no longer sold
}
export interface PublicProduct {
  id: number; slug: string; name: string; status: "ACTIVE" | "DISCONTINUED";
  brand: { name: string; slug: string } | null; category: { name: string; slug: string } | null;
  breadcrumb: Crumb[]; imageUrl: string | null; specLine: string | null; descriptionMd: string | null;
  baseCode: string; skus: PublicSku[];      // visible SKUs only, base first then by conversion
  related: ProductCard[];                   // up to 5 from the same category
  seoTitle: string | null; seoDescription: string | null;
  galleryUrls: string[];                    // photos after the cover, product page only
}
export interface NavCategory { id: number; name: string; slug: string; productCount: number; imageUrl: string | null; children: { id: number; name: string; slug: string; productCount: number }[] }
export interface Nav { categories: NavCategory[]; brands: { name: string; slug: string; productCount: number }[] }
export interface HomeData {
  categories: { name: string; slug: string; productCount: number; description: string | null; imageUrl: string | null }[];
  brands: { name: string; slug: string; productCount: number }[];
  sections: { category: { name: string; slug: string }; products: ProductCard[] }[];   // up to 8 per level-1 category
}
export interface CategoryListing extends Page<ProductCard> {
  category: { id: number; name: string; slug: string; description: string | null; imageUrl: string | null; parent: { name: string; slug: string } | null };
  breadcrumb: Crumb[];
  children: { name: string; slug: string; productCount: number; description: string | null; imageUrl: string | null }[];
  facets: { brands: { name: string; slug: string; count: number }[] };
}
export interface BrandListing extends Page<ProductCard> {
  brand: { name: string; slug: string; description: string | null }; breadcrumb: Crumb[];
  facets: { categories: { name: string; slug: string; count: number }[] };
}
export interface SearchResult extends Page<ProductCard> { q: string }
export interface Suggest { items: { name: string; slug: string; code: string | null }[] }
export interface SitemapData { products: { slug: string; updatedAt: string }[]; categories: { slug: string }[]; brands: { slug: string }[] }

export interface CartLineIn { skuId: number; qty: number }
export interface PricedLine {
  skuId: number; unavailable: boolean;      // true => sku missing/unpublished/discontinued (other fields empty/null)
  code: string; productName: string; productSlug: string; unitName: string; conversion: number; qty: number;
  priceVisible: boolean; orderable: boolean;
  listPrice: number | null; unitPrice: number | null; lineTotal: number | null;   // unitPrice = effective (post-promo)
}
export interface PricedCart { lines: PricedLine[]; subtotal: number; discountTotal: number; discountNote: string | null; total: number; hasContactLines: boolean }
export interface QuoteSubmit {
  submissionId: string; customerName: string; phone: string; email?: string; company?: string; taxCode?: string; note?: string;
  website?: string; lines: CartLineIn[];
}
export type QuoteStatus = "NEW" | "QUOTED" | "WON" | "CANCELLED";
export interface QuoteView { code: string; status: QuoteStatus; createdAt: string; customerName: string; lines: PricedLine[]; subtotal: number; hasContactLines: boolean }
export interface OrderSubmit {
  submissionId: string; customerName: string; phone: string; address: string; note?: string;
  paymentMethod: PaymentMethod; expectedTotal: number; website?: string; lines: CartLineIn[];
}
export type PaymentMethod = "COD" | "BANK_TRANSFER";
export type OrderStatus = "PENDING" | "CONFIRMED" | "PAID" | "ENTERED_KIOTVIET" | "SHIPPING" | "COMPLETED" | "CANCELLED";
export interface OrderItemView { skuCode: string; productName: string; unitName: string; conversion: number; qty: number; listPrice: number; unitPrice: number; lineTotal: number }
export interface OrderView {
  code: string; status: OrderStatus; paymentMethod: PaymentMethod; createdAt: string;
  customerName: string; phoneMasked: string;                 // "0912 *** 678", never the address
  items: OrderItemView[]; subtotal: number; discountTotal: number; discountNote: string | null;
  shippingFee: number | null;                                // null until staff confirm
  total: number;                                             // subtotal - discountTotal + (shippingFee ?? 0)
  bank: (BankInfo & { content: string }) | null;             // BANK_TRANSFER and status PENDING or CONFIRMED only; content = order code
  qrAmount: number | null;                                   // = total only when CONFIRMED with shippingFee set; null => account + content as text, NO QR
  paidAt: string | null;
}
export interface LookupRequest { code: string; phone: string }

export interface AdminProductRow {
  id: number; name: string; slug: string; brandName: string | null; categoryName: string | null;
  published: boolean; status: "ACTIVE" | "DISCONTINUED"; skuCount: number; baseCode: string | null; basePrice: number | null;
  needsAttention: boolean; needsConfirmation: boolean; updatedAt: string;
  images: string[];                                 // cover first
}
export interface AdminProductList { items: AdminProductRow[]; page: number; size: number; total: number; totals: { products: number; skus: number; visibleSkus: number } }
export interface AdminSku {
  id: number | null; version: number | null; code: string; name: string | null; unitName: string; conversion: number; isBase: boolean;
  price: number | null; priceVisible: boolean; needsConfirmation: boolean;
  promoPrice: number | null; promoFrom: string | null; promoTo: string | null;
  visible: boolean; source: "MANUAL" | "SEED" | "KIOTVIET";
  perBaseUnit: number | null;                       // read-only, computed
  warnings: { type: "PRICE_MISMATCH"; message: string; deviationPct: number }[];   // read-only
}
export interface AdminProduct {
  id: number | null; version: number | null; name: string; slug: string;
  brandId: number | null; categoryId: number | null; descriptionMd: string | null; specLine: string | null; imageUrl: string | null;
  galleryUrls: string[];
  seoTitle: string | null; seoDescription: string | null; internalNote: string | null;
  published: boolean; status: "ACTIVE" | "DISCONTINUED";
  skus: AdminSku[];
  warnings: { type: "NO_IMAGE" | "NEEDS_CONFIRMATION" | "NOT_PUBLISHABLE"; message: string }[];   // read-only
  priceHistory: { skuCode: string; field: "PRICE" | "PROMO"; oldPrice: number | null; newPrice: number | null; changedBy: string | null; changedAt: string }[];   // read-only, last 50
}
export interface AdminCategory { id: number; name: string; slug: string; parentId: number | null; description: string | null; imageUrl: string | null; visible: boolean; sortOrder: number; productCount: number; children: AdminCategory[] }
export interface AdminBrand { id: number; name: string; slug: string; visible: boolean; productCount: number }

export interface RequestRow {
  kind: "ORDER" | "QUOTE"; id: number; code: string; customerName: string; phone: string; createdAt: string; itemCount: number;
  total: number | null; paymentMethod: PaymentMethod | null; status: string; assigneeName: string | null;
}
export interface RequestList { items: RequestRow[]; page: number; size: number; total: number; totals: { count: number; totalAmount: number } }
export interface RequestCounters { newQuotes: number; pendingOrders: number; awaitingKiotViet: number; bankReview: number }
export interface HistoryEntry { at: string; actor: string; action: string; from: string | null; to: string | null; note: string | null }
export interface BankTransactionRow {
  id: number; txTime: string; amount: number; direction: "IN" | "OUT"; accountNoMasked: string; content: string;
  status: "RECEIVED" | "MATCHED" | "REVIEW" | "IGNORED"; reviewReason: string | null; orderCode: string | null; decisionNote: string | null;
}
export type OrderTransitionField = "shippingFee" | "paidAmount" | "note" | "kiotvietOrderCode";
export interface AdminOrder {
  id: number; code: string; status: OrderStatus; paymentMethod: PaymentMethod; createdAt: string;
  customerName: string; phone: string; address: string; note: string | null; internalNote: string | null;
  items: (OrderItemView & { skuId: number })[];
  subtotal: number; discountTotal: number; discountNote: string | null; shippingFee: number | null; total: number;
  paidAmount: number | null; paidVia: "MANUAL" | "BANK_WEBHOOK" | null; paidAt: string | null; kiotvietOrderCode: string | null;
  awaitsKiotVietEntry: boolean;
  allowedTransitions: { to: OrderStatus; requires: OrderTransitionField[] }[];   // already filtered by the caller's role
  history: HistoryEntry[]; bankTransactions: BankTransactionRow[];
}
export interface OrderTransition { to: OrderStatus; shippingFee?: number; paidAmount?: number; kiotvietOrderCode?: string; note?: string }
export interface AdminQuote {
  id: number; code: string; status: QuoteStatus; createdAt: string;
  customerName: string; phone: string; email: string | null; company: string | null; taxCode: string | null; note: string | null; internalNote: string | null;
  lines: { skuCode: string; productName: string; unitName: string; conversion: number; qty: number; unitPrice: number | null; lineTotal: number | null }[];
  subtotal: number; hasContactLines: boolean;
  allowedTransitions: { to: QuoteStatus }[]; history: HistoryEntry[];
}
export interface SepayWebhook {
  id: number | string; gateway?: string; transactionDate?: string; accountNumber: string; subAccount?: string | null; code?: string | null;
  content: string; transferType: "in" | "out"; description?: string; transferAmount: number; accumulated?: number; referenceCode?: string;
}
