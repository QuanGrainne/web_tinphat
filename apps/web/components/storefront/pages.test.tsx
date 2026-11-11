import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CategoryListing,
  HomeData,
  Nav,
  ProductCard,
  PublicProduct,
  PublicSettings,
  PublicSku,
} from "@/lib/api/types";

vi.mock("@/lib/api/server-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/server-fetch")>()),
  apiGet: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined }),
  usePathname: () => "/",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { apiGet } = await import("@/lib/api/server-fetch");
const { default: HomePage } = await import("@/app/(storefront)/page");
const { default: ProductPage } =
  await import("@/app/(storefront)/san-pham/[slug]/page");
const { default: CategoryPage, generateMetadata: categoryMetadata } =
  await import("@/app/(storefront)/danh-muc/[slug]/page");
const { default: BrandPage } =
  await import("@/app/(storefront)/thuong-hieu/[slug]/page");
const { default: SearchPage } =
  await import("@/app/(storefront)/tim-kiem/page");

const settings: PublicSettings = {
  company: {
    name: "CÔNG TY TNHH DNA HOÀNG NGUYÊN",
    taxCode: "5400533724",
    address: "Phú Thọ",
    warehouse: "Kho",
    phone: "0366 985 679",
    email: "a@b.vn",
  },
  hotline: "0366 985 679",
  zalo: null,
  facebook: null,
  trustStrip: ["Giá đã gồm VAT", "Hotline 0366 985 679"],
};

const nav: Nav = {
  categories: [
    {
      id: 1,
      name: "Giấy",
      slug: "giay",
      productCount: 3,
      imageUrl: null,
      children: [{ id: 2, name: "Giấy ăn", slug: "giay-an", productCount: 2 }],
    },
  ],
  brands: [{ name: "Sen Vàng", slug: "sen-vang", productCount: 3 }],
};

function card(id: number, overrides: Partial<ProductCard> = {}): ProductCard {
  return {
    id,
    slug: `sp-${id}`,
    name: `Sản phẩm ${id}`,
    brand: { name: "Sen Vàng", slug: "sen-vang" },
    imageUrl: null,
    specLine: null,
    fromPrice: 8570,
    fromUnitName: "Gói",
    hasMultipleUnits: true,
    units: [{ name: "Gói", priceVisible: true }],
    discontinued: false,
    ...overrides,
  };
}

function sku(overrides: Partial<PublicSku> = {}): PublicSku {
  return {
    id: 1,
    code: "SV320-3L-Gói",
    unitName: "Gói",
    conversion: 1,
    isBase: true,
    priceVisible: true,
    price: 8570,
    effectivePrice: 8570,
    promoActive: false,
    promoPrice: null,
    promoTo: null,
    perBaseUnit: 8570,
    saving: { kind: "NONE", pct: null },
    ...overrides,
  };
}

function product(overrides: Partial<PublicProduct> = {}): PublicProduct {
  return {
    id: 1,
    slug: "giay-an",
    name: "Giấy ăn </script> Gấu trúc",
    status: "ACTIVE",
    brand: { name: "Sen Vàng", slug: "sen-vang" },
    category: { name: "Giấy", slug: "giay" },
    breadcrumb: [{ name: "Giấy", href: "/danh-muc/giay" }],
    imageUrl: null,
    specLine: "300 tờ",
    descriptionMd: "Mô tả **đậm**",
    baseCode: "SV320-3L-Gói",
    skus: [sku()],
    related: [card(2), card(3)],
    seoTitle: null,
    seoDescription: null,
    galleryUrls: [],
    ...overrides,
  };
}

function listing(overrides: Partial<CategoryListing> = {}): CategoryListing {
  return {
    items: [card(1), card(2)],
    page: 1,
    pageSize: 24,
    total: 50,
    category: {
      id: 1,
      name: "Giấy",
      slug: "giay",
      description: null,
      imageUrl: null,
      parent: null,
    },
    breadcrumb: [],
    children: [],
    facets: {
      brands: [
        { name: "Sen Vàng", slug: "sen-vang", count: 30 },
        { name: "Phong Lan", slug: "phong-lan", count: 20 },
      ],
    },
    ...overrides,
  };
}

function respond(routes: Record<string, unknown>) {
  vi.mocked(apiGet).mockImplementation(async (path: string) => {
    const key = Object.keys(routes).find((prefix) => path.startsWith(prefix));
    if (!key) throw new Error(`unexpected api call ${path}`);
    return routes[key] as never;
  });
}

const params = (slug: string) => Promise.resolve({ slug });
const search = (raw: Record<string, string | string[]> = {}) =>
  Promise.resolve(raw);

beforeEach(() => {
  vi.mocked(apiGet).mockReset();
});

describe("home page", () => {
  it("shows the banner, category tiles, one priced row per category and the company sections", async () => {
    const home: HomeData = {
      categories: [
        {
          name: "Giấy",
          slug: "giay",
          productCount: 3,
          description: null,
          imageUrl: "/uploads/images/a.jpg",
        },
      ],
      brands: [],
      sections: [
        {
          category: { name: "Giấy", slug: "giay" },
          products: [card(1), card(2)],
        },
      ],
    };
    respond({
      "/api/public/home": home,
      "/api/public/nav": nav,
      "/api/public/settings": settings,
    });
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain("cho mọi");
    expect(html).toContain("/_next/image?url=%2Fuploads%2Fimages%2Fa.jpg");
    expect(html).toContain("Xem thêm sản phẩm");
    expect(html).toContain("8.570");
    expect(html).toContain("Liên hệ ngay");
    expect(html).toContain('href="/san-pham"');
    expect(html).toContain("hợp tác.</em>");
    expect(html).toContain("application/ld+json");
  });
});

describe("contact band", () => {
  it("shows the invitation, the four contact cards and the map with directions", async () => {
    const { ContactCta } =
      await import("@/components/storefront/tinphat-sections");
    const html = renderToStaticMarkup(<ContactCta settings={settings} />);
    expect(html).toContain('id="lien-he"');
    expect(html).toContain("nguồn hàng decor?");
    expect(html).toContain("Hotline");
    expect(html).toContain("https://www.google.com/maps/embed");
    expect(html).toContain("Xem đường đi");
  });
});

describe("product page", () => {
  it("renders breadcrumb, contact panel, description, related cards and escaped structured data", async () => {
    respond({
      "/api/public/products/": product(),
      "/api/public/settings": settings,
    });
    const html = renderToStaticMarkup(
      await ProductPage({ params: params("giay-an") }),
    );
    expect(html).toContain("Sản phẩm cùng danh mục");
    expect(html).toContain("<strong>đậm</strong>");
    expect(html).toContain("Liên hệ để nhận báo giá");
    expect(html).toContain('href="tel:0366985679"');
    expect(html).not.toContain("Thêm báo giá");
    expect(html).toContain('aria-label="Breadcrumb"');
    const jsonLd =
      html.match(
        /<script type="application\/ld\+json">([^<]*)<\/script>/,
      )?.[1] ?? "";
    expect(jsonLd).toContain("\\u003c/script>");
    expect(jsonLd).toContain('"@type":"Product"');
    expect(jsonLd).toContain('"@type":"BreadcrumbList"');
  });

  it("shows a notice instead of prices and buttons when discontinued", async () => {
    respond({
      "/api/public/products/": product({
        status: "DISCONTINUED",
        skus: [sku({ price: 424242, effectivePrice: 424242 })],
      }),
      "/api/public/settings": settings,
    });
    const html = renderToStaticMarkup(
      await ProductPage({ params: params("giay-an") }),
    );
    expect(html).toContain("Sản phẩm đã ngừng kinh doanh.");
    expect(html).not.toContain("Liên hệ để nhận báo giá");
    expect(html).not.toContain("424.242đ");
    expect(html).not.toContain("application/ld+json");
  });
});

describe("category page", () => {
  it("renders the category header and pagination, without price sorting or brand filters", async () => {
    const category = {
      id: 1,
      name: "Giấy",
      slug: "giay",
      description: "Mô tả nhóm",
      imageUrl: "/uploads/images/a.jpg",
      parent: null,
    };
    respond({
      "/api/public/categories/": listing({ category }),
      "/api/public/nav": nav,
    });
    const html = renderToStaticMarkup(
      await CategoryPage({ params: params("giay"), searchParams: search() }),
    );
    expect(html).toContain("50 sản phẩm");
    expect(html).toContain("Mô tả nhóm");
    expect(html).toContain("/_next/image?url=%2Fuploads%2Fimages%2Fa.jpg");
    expect(html).toContain('href="/danh-muc/giay?page=2"');
    expect(html).toContain('rel="next"');
    expect(html).toContain('aria-current="page" href="/danh-muc/giay"');
    expect(html).not.toContain('name="brand"');
    expect(html).not.toContain("Giá cao xuống thấp");
  });

  it("passes only the page through to the api", async () => {
    respond({ "/api/public/categories/": listing(), "/api/public/nav": nav });
    await CategoryPage({
      params: params("giay"),
      searchParams: search({
        brand: ["sen-vang", "gp"],
        sort: "name_desc",
        page: "2",
      }),
    });
    const called = vi.mocked(apiGet).mock.calls.map((c) => c[0]);
    expect(called).toContain("/api/public/categories/giay?page=2");
  });

  it("canonicalises filtered and sorted views to the plain listing and keeps only the page number", async () => {
    respond({ "/api/public/categories/": listing() });
    const filtered = await categoryMetadata({
      params: params("giay"),
      searchParams: search({ brand: "sen-vang", sort: "price_desc" }),
    });
    expect(filtered.alternates?.canonical).toBe("/danh-muc/giay");
    const paged = await categoryMetadata({
      params: params("giay"),
      searchParams: search({ brand: "sen-vang", page: "3" }),
    });
    expect(paged.alternates?.canonical).toBe("/danh-muc/giay?page=3");
  });

  it("shows an empty state when nothing matches", async () => {
    respond({
      "/api/public/categories/": listing({ items: [], total: 0 }),
      "/api/public/nav": nav,
    });
    const html = renderToStaticMarkup(
      await CategoryPage({ params: params("giay"), searchParams: search() }),
    );
    expect(html).toContain("Chưa có sản phẩm");
  });
});

describe("brand page", () => {
  it("lists category facets as links and keeps the selected one", async () => {
    respond({
      "/api/public/brands/": {
        ...listing(),
        brand: { name: "Sen Vàng", slug: "sen-vang", description: null },
        facets: {
          categories: [{ name: "Giấy ăn", slug: "giay-an", count: 12 }],
        },
      },
    });
    const html = renderToStaticMarkup(
      await BrandPage({
        params: params("sen-vang"),
        searchParams: search({ category: "giay-an" }),
      }),
    );
    expect(html).toContain('href="/thuong-hieu/sen-vang?category=giay-an"');
    expect(html).toContain("Giấy ăn");
    expect(vi.mocked(apiGet).mock.calls[0][0]).toBe(
      "/api/public/brands/sen-vang?category=giay-an",
    );
  });
});

describe("search page", () => {
  it("does not call the api for a query shorter than 2 characters", async () => {
    const html = renderToStaticMarkup(
      await SearchPage({ searchParams: search({ q: "g" }) }),
    );
    expect(html).toContain("Nhập ít nhất 2 ký tự");
    expect(apiGet).not.toHaveBeenCalled();
  });

  it("renders results and an empty state", async () => {
    respond({
      "/api/public/search": {
        items: [card(1)],
        page: 1,
        pageSize: 24,
        total: 1,
        q: "giay",
      },
    });
    const found = renderToStaticMarkup(
      await SearchPage({ searchParams: search({ q: "giay" }) }),
    );
    expect(found).toContain("Sản phẩm 1");
    expect(found).toContain("1 sản phẩm");
    respond({
      "/api/public/search": {
        items: [],
        page: 1,
        pageSize: 24,
        total: 0,
        q: "zzz",
      },
    });
    const none = renderToStaticMarkup(
      await SearchPage({ searchParams: search({ q: "zzz" }) }),
    );
    expect(none).toContain("Không tìm thấy sản phẩm");
  });
});
