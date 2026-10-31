package vn.dnahoangnguyen.api.catalog.product;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.dnahoangnguyen.api.catalog.CatalogTime;
import vn.dnahoangnguyen.api.catalog.brand.Brand;
import vn.dnahoangnguyen.api.catalog.brand.BrandRepository;
import vn.dnahoangnguyen.api.catalog.category.Category;
import vn.dnahoangnguyen.api.catalog.category.CategoryRepository;
import vn.dnahoangnguyen.api.catalog.pricing.PriceHistory;
import vn.dnahoangnguyen.api.catalog.pricing.PriceHistoryRepository;
import vn.dnahoangnguyen.api.catalog.pricing.PriceRules;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminProduct;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminProductList;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminProductRow;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminSku;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.PriceHistoryRow;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.ProductWarning;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.SkuWarning;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.Totals;
import vn.dnahoangnguyen.api.catalog.product.ProductPublishRules.SkuState;
import vn.dnahoangnguyen.api.catalog.sku.Sku;
import vn.dnahoangnguyen.api.catalog.sku.SkuRepository;
import vn.dnahoangnguyen.api.catalog.text.TextFold;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.settings.SettingsService;

/** Read side of the admin catalogue: the product list and the full aggregate with its read-only warnings. */
@Service
public class ProductAdminService {

    public static final int DEFAULT_PAGE_SIZE = 30;
    private static final int MAX_PAGE_SIZE = 100;

    private final ProductRepository products;
    private final SkuRepository skus;
    private final BrandRepository brands;
    private final CategoryRepository categories;
    private final PriceHistoryRepository history;
    private final SettingsService settings;

    public ProductAdminService(ProductRepository products, SkuRepository skus, BrandRepository brands,
                               CategoryRepository categories, PriceHistoryRepository history,
                               SettingsService settings) {
        this.products = products;
        this.skus = skus;
        this.brands = brands;
        this.categories = categories;
        this.history = history;
        this.settings = settings;
    }

    @Transactional(readOnly = true)
    public AdminProductList list(String q, Long categoryId, Long brandId, Boolean published, Boolean needsAttention,
                                 int requestedPage, int requestedSize) {
        int page = Math.max(1, requestedPage);
        int size = requestedSize < 1 ? DEFAULT_PAGE_SIZE : Math.min(requestedSize, MAX_PAGE_SIZE);

        Map<Long, List<Sku>> skusByProduct = skus.findAll().stream().collect(Collectors.groupingBy(Sku::getProductId));
        Map<Long, Brand> brandById = brands.findAll().stream().collect(Collectors.toMap(Brand::getId, b -> b));
        Map<Long, Category> categoryById = categories.findAll().stream().collect(Collectors.toMap(Category::getId, c -> c));
        List<String> tokens = q == null || q.isBlank() ? List.of() : List.of(TextFold.fold(q).split(" "));

        List<Product> filtered = products.findAll().stream()
                .filter(p -> tokens.isEmpty() || matches(p, skusByProduct.getOrDefault(p.getId(), List.of()), tokens))
                .filter(p -> categoryId == null || inCategory(p, categoryId, categoryById))
                .filter(p -> brandId == null || brandId.equals(p.getBrandId()))
                .filter(p -> published == null || published == p.isPublished())
                .filter(p -> needsAttention == null
                        || needsAttention == needsAttention(p, skusByProduct.getOrDefault(p.getId(), List.of())))
                .sorted(Comparator.comparing(Product::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Product::getId, Comparator.reverseOrder()))
                .toList();

        long skuTotal = 0;
        long visibleTotal = 0;
        for (Product p : filtered) {
            List<Sku> list = skusByProduct.getOrDefault(p.getId(), List.of());
            skuTotal += list.size();
            visibleTotal += list.stream().filter(Sku::isVisible).count();
        }
        int from = (int) Math.min((long) (page - 1) * size, filtered.size());
        int to = Math.min(from + size, filtered.size());
        List<AdminProductRow> rows = filtered.subList(from, to).stream()
                .map(p -> toRow(p, skusByProduct.getOrDefault(p.getId(), List.of()), brandById, categoryById))
                .toList();
        return new AdminProductList(rows, page, size, filtered.size(), new Totals(filtered.size(), skuTotal, visibleTotal));
    }

    @Transactional(readOnly = true)
    public AdminProduct get(long id) {
        Product p = products.findById(id).orElseThrow(() -> DomainException.notFound("Không tìm thấy sản phẩm."));
        List<Sku> list = skus.findByProductId(id).stream()
                .sorted(Comparator.comparingInt(Sku::getSortOrder).thenComparing(Sku::getId)).toList();
        Sku base = list.stream().filter(Sku::isBase).findFirst().orElse(null);
        double threshold = settings.mismatchThresholdPct();

        List<AdminSku> skuRows = list.stream().map(s -> toAdminSku(s, base, threshold)).toList();
        return new AdminProduct(p.getId(), p.getVersion(), p.getName(), p.getSlug(), p.getBrandId(), p.getCategoryId(),
                p.getDescriptionMd(), p.getSpecLine(), p.getImageUrl(), p.getSeoTitle(), p.getSeoDescription(),
                p.getInternalNote(), p.isPublished(), p.getStatus(), skuRows, productWarnings(p, list),
                priceHistory(list));
    }

    // ---- list helpers ----

    private static boolean matches(Product p, Collection<Sku> list, List<String> tokens) {
        StringBuilder haystack = new StringBuilder(p.getName());
        list.forEach(s -> haystack.append(' ').append(s.getCode()));
        String folded = TextFold.fold(haystack.toString());
        return tokens.stream().allMatch(folded::contains);
    }

    private static boolean inCategory(Product p, long categoryId, Map<Long, Category> categoryById) {
        if (p.getCategoryId() == null) {
            return false;
        }
        if (p.getCategoryId() == categoryId) {
            return true;
        }
        Category own = categoryById.get(p.getCategoryId());
        return own != null && own.getParentId() != null && own.getParentId() == categoryId;
    }

    /** "Cần bổ sung": no image, a SKU awaiting confirmation, or an unpublished product that cannot be published yet. */
    static boolean needsAttention(Product p, Collection<Sku> list) {
        boolean flagged = list.stream().anyMatch(Sku::isNeedsConfirmation);
        boolean notReady = !p.isPublished() && !ProductPublishRules.missing(p.getCategoryId(), states(list)).isEmpty();
        return !ProductPublishRules.hasImage(p.getImageUrl()) || flagged || notReady;
    }

    private static AdminProductRow toRow(Product p, List<Sku> list, Map<Long, Brand> brandById,
                                         Map<Long, Category> categoryById) {
        Sku base = list.stream().filter(Sku::isBase).findFirst().orElse(null);
        Brand brand = p.getBrandId() == null ? null : brandById.get(p.getBrandId());
        Category category = p.getCategoryId() == null ? null : categoryById.get(p.getCategoryId());
        return new AdminProductRow(p.getId(), p.getName(), p.getSlug(), brand == null ? null : brand.getName(),
                category == null ? null : category.getName(), p.isPublished(), p.getStatus(), list.size(),
                base == null ? null : base.getCode(), base == null ? null : base.getPrice(), needsAttention(p, list),
                list.stream().anyMatch(Sku::isNeedsConfirmation), CatalogTime.iso(p.getUpdatedAt()));
    }

    private static List<SkuState> states(Collection<Sku> list) {
        return list.stream().map(s -> new SkuState(s.isVisible(), s.getPrice())).toList();
    }

    // ---- aggregate helpers ----

    private static AdminSku toAdminSku(Sku s, Sku base, double threshold) {
        List<SkuWarning> warnings = new ArrayList<>();
        if (base != null && !s.isBase() && PriceRules.isMismatch(base.getPrice(), s.getConversion(), s.getPrice(), threshold)) {
            double deviation = PriceRules.packDeviationPct(base.getPrice(), s.getConversion(), s.getPrice());
            long expected = base.getPrice() * s.getConversion();
            warnings.add(new SkuWarning("PRICE_MISMATCH",
                    "Giá lệch " + signedPercent(deviation) + " so với đơn giá × quy cách (" + money(expected) + ").",
                    deviation));
        }
        return new AdminSku(s.getId(), s.getVersion(), s.getCode(), s.getName(), s.getUnitName(), s.getConversion(),
                s.isBase(), s.getPrice(), s.isPriceVisible(), s.isNeedsConfirmation(), s.getPromoPrice(),
                s.getPromoFrom(), s.getPromoTo(), s.isVisible(), s.getSource(),
                s.getPrice() == null ? null : PriceRules.perBaseUnit(s.getPrice(), s.getConversion()), warnings);
    }

    private static List<ProductWarning> productWarnings(Product p, List<Sku> list) {
        List<ProductWarning> warnings = new ArrayList<>();
        if (!ProductPublishRules.hasImage(p.getImageUrl())) {
            warnings.add(new ProductWarning("NO_IMAGE", "Chưa có ảnh sản phẩm."));
        }
        if (list.stream().anyMatch(Sku::isNeedsConfirmation)) {
            warnings.add(new ProductWarning("NEEDS_CONFIRMATION", "Có quy cách cần xác nhận."));
        }
        List<String> missing = ProductPublishRules.missing(p.getCategoryId(), states(list));
        if (!p.isPublished() && !missing.isEmpty()) {
            warnings.add(new ProductWarning("NOT_PUBLISHABLE",
                    "Chưa thể đăng: " + ProductPublishRules.describe(missing) + "."));
        }
        return warnings;
    }

    private List<PriceHistoryRow> priceHistory(List<Sku> list) {
        if (list.isEmpty()) {
            return List.of();
        }
        Map<Long, String> codes = new HashMap<>();
        list.forEach(s -> codes.put(s.getId(), s.getCode()));
        return history.findTop50BySkuIdInOrderByChangedAtDescIdDesc(codes.keySet()).stream()
                .map(h -> new PriceHistoryRow(codes.get(h.getSkuId()), h.getField().name(), h.getOldPrice(),
                        h.getNewPrice(), h.getChangedBy(), CatalogTime.iso(h.getChangedAt())))
                .toList();
    }

    // ---- Vietnamese number formatting (dot thousands, comma decimals) ----

    private static DecimalFormatSymbols viSymbols() {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.ROOT);
        symbols.setGroupingSeparator('.');
        symbols.setDecimalSeparator(',');
        return symbols;
    }

    static String money(long amount) {
        return new DecimalFormat("#,##0", viSymbols()).format(amount) + "đ";
    }

    static String signedPercent(double pct) {
        return (pct > 0 ? "+" : "") + new DecimalFormat("0.0", viSymbols()).format(pct) + "%";
    }
}
