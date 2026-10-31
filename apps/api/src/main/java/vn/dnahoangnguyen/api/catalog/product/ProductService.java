package vn.dnahoangnguyen.api.catalog.product;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.dnahoangnguyen.api.admin.audit.AuditService;
import vn.dnahoangnguyen.api.catalog.brand.Brand;
import vn.dnahoangnguyen.api.catalog.brand.BrandRepository;
import vn.dnahoangnguyen.api.catalog.category.CategoryRepository;
import vn.dnahoangnguyen.api.catalog.pricing.PriceHistory;
import vn.dnahoangnguyen.api.catalog.pricing.PriceHistoryRepository;
import vn.dnahoangnguyen.api.catalog.pricing.PriceRules;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminProduct;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminSku;
import vn.dnahoangnguyen.api.catalog.product.ProductPublishRules.SkuState;
import vn.dnahoangnguyen.api.catalog.sku.Sku;
import vn.dnahoangnguyen.api.catalog.sku.SkuCodeKey;
import vn.dnahoangnguyen.api.catalog.sku.SkuRepository;
import vn.dnahoangnguyen.api.catalog.sku.SkuSource;
import vn.dnahoangnguyen.api.catalog.slug.SlugUtil;
import vn.dnahoangnguyen.api.catalog.text.TextFold;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;

/**
 * The only code that writes products and SKUs. One call saves the whole aggregate (product + SKUs), keeps
 * {@code search_text} in step, and writes price history and audit rows in the caller's transaction.
 */
@Service
public class ProductService {

    private static final int MAX_NAME = 300;
    private static final int MAX_CODE = 80;
    private static final int MAX_UNIT = 60;
    private static final int MAX_SPEC = 300;
    private static final int MAX_SEO_TITLE = 200;
    private static final int MAX_SEO_DESCRIPTION = 400;
    private static final int MAX_IMAGE_URL = 500;
    // keeps price * conversion far below Long.MAX_VALUE in every pricing calculation
    private static final int MAX_CONVERSION = 1_000_000;
    private static final long MAX_PRICE = 1_000_000_000_000L;

    private final ProductRepository products;
    private final SkuRepository skus;
    private final BrandRepository brands;
    private final CategoryRepository categories;
    private final PriceHistoryRepository history;
    private final AuditService audit;

    public ProductService(ProductRepository products, SkuRepository skus, BrandRepository brands,
                          CategoryRepository categories, PriceHistoryRepository history, AuditService audit) {
        this.products = products;
        this.skus = skus;
        this.brands = brands;
        this.categories = categories;
        this.history = history;
        this.audit = audit;
    }

    /** A request row resolved against the stored SKU it updates (null target = new SKU). */
    private record Draft(AdminSku row, Sku target, String codeKey, boolean base, boolean visible,
                         boolean priceVisible, boolean needsConfirmation) {
    }

    /**
     * Creates ({@code id == null}) or updates a product with all its SKUs. SKUs missing from an update are hidden,
     * never deleted. Returns the product id.
     */
    @Transactional
    public long saveAggregate(Long id, AdminProduct in, ChangeActor actor, ChangeSource source) {
        validateProductFields(in);
        if (in.skus() == null || in.skus().isEmpty()) {
            throw invalid("Sản phẩm cần có ít nhất một quy cách.");
        }
        boolean creating = id == null;
        Product product = creating ? new Product() : require(id);
        if (!creating) {
            checkVersion(in.version(), product.getVersion());
        }
        List<Sku> existing = creating ? List.of() : skus.findByProductId(product.getId());

        List<Draft> drafts = resolveDrafts(in.skus(), existing);
        validateDrafts(drafts);
        guardRestrictedFields(drafts, actor, source);
        ensureCodesAreFree(drafts);

        Brand brand = in.brandId() == null ? null : brands.findById(in.brandId())
                .orElseThrow(() -> invalid("Thương hiệu không tồn tại."));
        if (in.categoryId() != null && !categories.existsById(in.categoryId())) {
            throw invalid("Nhóm hàng không tồn tại.");
        }

        Map<String, Object> before = creating ? null : snapshot(product, existing);
        applyProductFields(product, in, creating);
        products.save(product);

        List<Sku> finalSkus = applySkus(product, drafts, existing, actor, source, creating);

        product.setSearchText(searchText(product.getName(), brand == null ? null : brand.getName(), finalSkus));
        product.touch();
        products.save(product);

        Map<String, Object> after = snapshot(product, finalSkus);
        if (creating) {
            audit.recordAs(actor.audit(), "PRODUCT_CREATE", "PRODUCT", product.getId(), null, after);
        } else if (!Objects.equals(before, after)) {
            audit.recordAs(actor.audit(), "PRODUCT_UPDATE", "PRODUCT", product.getId(), before, after);
        }
        return product.getId();
    }

    @Transactional
    public void publish(long id, ChangeActor actor) {
        Product product = require(id);
        List<String> missing = ProductPublishRules.missing(product.getCategoryId(), skuStates(skus.findByProductId(id)));
        if (!missing.isEmpty()) {
            throw DomainException.unprocessable(ProblemCode.PUBLISH_REQUIREMENTS_UNMET,
                    "Chưa thể đăng sản phẩm: " + ProductPublishRules.describe(missing) + ".")
                    .withExtension("missing", missing);
        }
        if (product.isPublished()) {
            return;
        }
        product.setPublished(true);
        if (product.getFirstPublishedAt() == null) {
            product.setFirstPublishedAt(Instant.now());
        }
        product.touch();
        products.save(product);
        audit.recordAs(actor.audit(), "PUBLISH", "PRODUCT", id, Map.of("published", false), Map.of("published", true));
    }

    @Transactional
    public void unpublish(long id, ChangeActor actor) {
        Product product = require(id);
        if (!product.isPublished()) {
            return;
        }
        product.setPublished(false);
        product.touch();
        products.save(product);
        audit.recordAs(actor.audit(), "UNPUBLISH", "PRODUCT", id, Map.of("published", true), Map.of("published", false));
    }

    @Transactional
    public void discontinue(long id, ChangeActor actor) {
        changeStatus(id, ProductStatus.DISCONTINUED, "DISCONTINUE", actor);
    }

    @Transactional
    public void reactivate(long id, ChangeActor actor) {
        changeStatus(id, ProductStatus.ACTIVE, "REACTIVATE", actor);
    }

    /** Recomputes {@code search_text} of every product of a brand after the brand was renamed. */
    @Transactional
    public void reindexBrand(Long brandId) {
        Brand brand = brands.findById(brandId).orElse(null);
        for (Product product : products.findByBrandId(brandId)) {
            product.setSearchText(searchText(product.getName(), brand == null ? null : brand.getName(),
                    skus.findByProductId(product.getId())));
        }
    }

    /** Folded name + brand + codes of the visible SKUs; what the storefront search matches against. */
    static String searchText(String name, String brandName, Collection<Sku> list) {
        StringBuilder text = new StringBuilder(name);
        if (brandName != null) {
            text.append(' ').append(brandName);
        }
        list.stream().filter(Sku::isVisible).forEach(s -> text.append(' ').append(s.getCode()));
        return TextFold.fold(text.toString());
    }

    private void changeStatus(long id, ProductStatus target, String action, ChangeActor actor) {
        Product product = require(id);
        if (product.getStatus() == target) {
            return;
        }
        ProductStatus old = product.getStatus();
        product.setStatus(target);
        product.touch();
        products.save(product);
        audit.recordAs(actor.audit(), action, "PRODUCT", id, Map.of("status", old.name()), Map.of("status", target.name()));
    }

    private Product require(long id) {
        return products.findById(id).orElseThrow(() -> DomainException.notFound("Không tìm thấy sản phẩm."));
    }

    private static List<SkuState> skuStates(Collection<Sku> list) {
        return list.stream().map(s -> new SkuState(s.isVisible(), s.getPrice())).toList();
    }

    // ---- validation and request resolution ----

    private static void validateProductFields(AdminProduct in) {
        requireText(in.name(), "Tên sản phẩm", MAX_NAME);
        maxLength(in.specLine(), "Quy cách tóm tắt", MAX_SPEC);
        maxLength(in.seoTitle(), "Tiêu đề SEO", MAX_SEO_TITLE);
        maxLength(in.seoDescription(), "Mô tả SEO", MAX_SEO_DESCRIPTION);
        maxLength(in.imageUrl(), "Ảnh", MAX_IMAGE_URL);
    }

    private List<Draft> resolveDrafts(List<AdminSku> rows, List<Sku> existing) {
        Map<Long, Sku> byId = new HashMap<>();
        Map<String, Sku> byKey = new HashMap<>();
        for (Sku sku : existing) {
            byId.put(sku.getId(), sku);
            byKey.put(sku.getCodeKey(), sku);
        }
        Set<Long> used = new HashSet<>();
        Set<String> keys = new HashSet<>();
        List<Draft> drafts = new ArrayList<>();
        for (AdminSku row : rows) {
            requireText(row.code(), "Mã hàng", MAX_CODE);
            requireText(row.unitName(), "Đơn vị tính", MAX_UNIT);
            maxLength(row.name(), "Tên quy cách", MAX_NAME);
            String key = SkuCodeKey.of(row.code());
            if (!keys.add(key)) {
                throw DomainException.conflict(ProblemCode.DUPLICATE,
                        "Mã hàng \"" + row.code() + "\" bị trùng trong danh sách quy cách.");
            }
            Sku target;
            if (row.id() != null) {
                target = byId.get(row.id());
                if (target == null) {
                    throw invalid("Quy cách không thuộc sản phẩm này.");
                }
                checkVersion(row.version(), target.getVersion());
            } else {
                // re-adding a code that was hidden earlier brings the same SKU back
                target = byKey.get(key);
            }
            if (target != null && !used.add(target.getId())) {
                throw DomainException.conflict(ProblemCode.DUPLICATE, "Quy cách bị lặp trong danh sách.");
            }
            drafts.add(new Draft(row, target, key,
                    flag(row.isBase(), target != null && target.isBase()),
                    flag(row.visible(), target == null || target.isVisible()),
                    flag(row.priceVisible(), target == null || target.isPriceVisible()),
                    flag(row.needsConfirmation(), target != null && target.isNeedsConfirmation())));
        }
        return drafts;
    }

    private static void validateDrafts(List<Draft> drafts) {
        long bases = drafts.stream().filter(Draft::base).count();
        if (bases != 1) {
            throw invalid("Phải có đúng một quy cách cơ sở (quy đổi = 1).");
        }
        for (Draft d : drafts) {
            AdminSku row = d.row();
            if (row.conversion() == null || row.conversion() < 1 || row.conversion() > MAX_CONVERSION) {
                throw invalid("Quy đổi của \"" + row.code() + "\" phải là số nguyên từ 1 đến " + MAX_CONVERSION + ".");
            }
            if (row.price() != null && (row.price() < 0 || row.price() > MAX_PRICE)) {
                throw invalid("Giá của \"" + row.code() + "\" không hợp lệ.");
            }
            if (d.base() && row.conversion() != 1) {
                throw invalid("Quy cách cơ sở phải có quy đổi = 1.");
            }
            if (d.base() && !d.visible()) {
                throw invalid("Quy cách cơ sở phải đang hiển thị.");
            }
            String promoError = PriceRules.promoError(row.price(), row.promoPrice(), row.promoFrom(), row.promoTo());
            if (promoError != null) {
                throw invalid(promoError + " (" + row.code() + ")");
            }
        }
    }

    private static void guardRestrictedFields(List<Draft> drafts, ChangeActor actor, ChangeSource source) {
        if (source != ChangeSource.MANUAL || actor.manager()) {
            return;
        }
        for (Draft d : drafts) {
            String field = d.target() == null ? "code" : restrictedChange(d);
            if (field != null) {
                throw new DomainException(HttpStatus.FORBIDDEN, ProblemCode.FORBIDDEN_FIELD,
                        "Bạn không có quyền thay đổi \"" + field + "\" (giá, quy cách, mã hàng chỉ dành cho quản lý).")
                        .withExtension("field", field);
            }
        }
    }

    /** Name of the first manager-only field the row changes, or null. */
    private static String restrictedChange(Draft d) {
        AdminSku row = d.row();
        Sku t = d.target();
        if (!Objects.equals(row.code(), t.getCode())) {
            return "code";
        }
        if (!Objects.equals(row.conversion(), t.getConversion())) {
            return "conversion";
        }
        if (d.base() != t.isBase()) {
            return "isBase";
        }
        if (!Objects.equals(row.price(), t.getPrice())) {
            return "price";
        }
        if (d.priceVisible() != t.isPriceVisible()) {
            return "priceVisible";
        }
        if (d.needsConfirmation() != t.isNeedsConfirmation()) {
            return "needsConfirmation";
        }
        if (!Objects.equals(row.promoPrice(), t.getPromoPrice())) {
            return "promoPrice";
        }
        if (!Objects.equals(row.promoFrom(), t.getPromoFrom())) {
            return "promoFrom";
        }
        if (!Objects.equals(row.promoTo(), t.getPromoTo())) {
            return "promoTo";
        }
        return null;
    }

    private void ensureCodesAreFree(List<Draft> drafts) {
        Map<String, Draft> byKey = new HashMap<>();
        drafts.forEach(d -> byKey.put(d.codeKey(), d));
        for (Sku clash : skus.findByCodeKeyIn(byKey.keySet())) {
            Draft owner = byKey.get(clash.getCodeKey());
            if (owner.target() == null || !owner.target().getId().equals(clash.getId())) {
                throw DomainException.conflict(ProblemCode.DUPLICATE,
                        "Mã hàng \"" + owner.row().code() + "\" đã tồn tại ở một quy cách khác.");
            }
        }
    }

    // ---- applying changes ----

    private void applyProductFields(Product product, AdminProduct in, boolean creating) {
        product.setName(in.name().strip());
        product.setBrandId(in.brandId());
        product.setCategoryId(in.categoryId());
        product.setDescriptionMd(blankToNull(in.descriptionMd()));
        product.setSpecLine(blankToNull(in.specLine()));
        product.setImageUrl(blankToNull(in.imageUrl()));
        product.setSeoTitle(blankToNull(in.seoTitle()));
        product.setSeoDescription(blankToNull(in.seoDescription()));
        product.setInternalNote(blankToNull(in.internalNote()));
        if (creating) {
            product.setStatus(ProductStatus.ACTIVE);
            product.setPublished(false);
            product.setSlug(SlugUtil.unique(SlugUtil.slugify(product.getName(), "san-pham"), products::existsBySlug));
        } else if (in.slug() != null && !in.slug().isBlank() && !in.slug().equals(product.getSlug())) {
            String wanted = SlugUtil.slugify(in.slug(), product.getSlug());
            if (!wanted.equals(product.getSlug())) {
                products.findBySlug(wanted).filter(other -> !other.getId().equals(product.getId())).ifPresent(other -> {
                    throw DomainException.conflict(ProblemCode.DUPLICATE, "Đường dẫn \"" + wanted + "\" đã được dùng.");
                });
                product.setSlug(wanted);
            }
        }
    }

    private List<Sku> applySkus(Product product, List<Draft> drafts, List<Sku> existing, ChangeActor actor,
                                ChangeSource source, boolean creating) {
        // the partial unique index allows one base SKU per product: release the old base before another claims it
        Draft newBase = drafts.stream().filter(Draft::base).findFirst().orElseThrow();
        boolean released = false;
        for (Sku sku : existing) {
            boolean stillBase = newBase.target() != null && newBase.target().getId().equals(sku.getId());
            if (sku.isBase() && !stillBase) {
                sku.setBase(false);
                released = true;
            }
        }
        if (released) {
            skus.flush();
        }

        String changedBy = source == ChangeSource.MANUAL ? actor.audit().name() : null;
        List<Sku> result = new ArrayList<>();
        Set<Long> kept = new HashSet<>();
        int order = 0;
        for (Draft d : drafts) {
            AdminSku row = d.row();
            boolean isNew = d.target() == null;
            Sku sku = isNew ? new Sku() : d.target();
            Long oldPrice = sku.getPrice();
            Long oldPromo = sku.getPromoPrice();
            LocalDate oldFrom = sku.getPromoFrom();
            LocalDate oldTo = sku.getPromoTo();

            if (isNew) {
                sku.setProductId(product.getId());
                sku.setSource(SkuSource.valueOf(source.name()));
            }
            sku.setCode(row.code());
            sku.setName(blankToNull(row.name()));
            sku.setUnitName(row.unitName().strip());
            sku.setConversion(row.conversion());
            sku.setBase(d.base());
            sku.setPrice(row.price());
            sku.setPriceVisible(d.priceVisible());
            sku.setNeedsConfirmation(d.needsConfirmation());
            sku.setPromoPrice(row.promoPrice());
            sku.setPromoFrom(row.promoPrice() == null ? null : row.promoFrom());
            sku.setPromoTo(row.promoPrice() == null ? null : row.promoTo());
            sku.setVisible(d.visible());
            sku.setSortOrder(order++);
            boolean priceChanged = !Objects.equals(oldPrice, sku.getPrice());
            if (!isNew && priceChanged && source == ChangeSource.MANUAL) {
                sku.setSource(SkuSource.MANUAL);
            }
            sku = skus.save(sku);
            kept.add(sku.getId());
            result.add(sku);

            if (priceChanged) {
                history.save(new PriceHistory(sku.getId(), PriceHistory.Field.PRICE, oldPrice, sku.getPrice(), null, null,
                        source, changedBy));
            }
            boolean promoChanged = !Objects.equals(oldPromo, sku.getPromoPrice())
                    || !Objects.equals(oldFrom, sku.getPromoFrom()) || !Objects.equals(oldTo, sku.getPromoTo());
            if (promoChanged) {
                history.save(new PriceHistory(sku.getId(), PriceHistory.Field.PROMO, oldPromo, sku.getPromoPrice(),
                        sku.getPromoFrom(), sku.getPromoTo(), source, changedBy));
            }
            if (!isNew && (priceChanged || promoChanged)) {
                audit.recordAs(actor.audit(), "PRICE_CHANGE", "SKU", sku.getId(),
                        priceSnapshot(oldPrice, oldPromo, oldFrom, oldTo),
                        priceSnapshot(sku.getPrice(), sku.getPromoPrice(), sku.getPromoFrom(), sku.getPromoTo()));
            }
        }
        for (Sku sku : existing) {
            if (!kept.contains(sku.getId())) {
                sku.setVisible(false);
                sku.setBase(false);
                result.add(skus.save(sku));
            }
        }
        return result;
    }

    private static Map<String, Object> priceSnapshot(Long price, Long promoPrice, LocalDate from, LocalDate to) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("price", price);
        map.put("promoPrice", promoPrice);
        map.put("promoFrom", from == null ? null : from.toString());
        map.put("promoTo", to == null ? null : to.toString());
        return map;
    }

    private static Map<String, Object> snapshot(Product p, Collection<Sku> list) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("name", p.getName());
        map.put("slug", p.getSlug());
        map.put("brandId", p.getBrandId());
        map.put("categoryId", p.getCategoryId());
        map.put("descriptionMd", p.getDescriptionMd());
        map.put("specLine", p.getSpecLine());
        map.put("imageUrl", p.getImageUrl());
        map.put("seoTitle", p.getSeoTitle());
        map.put("seoDescription", p.getSeoDescription());
        map.put("internalNote", p.getInternalNote());
        Map<String, Object> skuMap = new LinkedHashMap<>();
        list.stream().sorted(Comparator.comparing(Sku::getCode)).forEach(s -> {
            Map<String, Object> one = new LinkedHashMap<>();
            one.put("name", s.getName());
            one.put("unitName", s.getUnitName());
            one.put("conversion", s.getConversion());
            one.put("isBase", s.isBase());
            one.put("priceVisible", s.isPriceVisible());
            one.put("needsConfirmation", s.isNeedsConfirmation());
            one.put("visible", s.isVisible());
            skuMap.put(s.getCode(), one);
        });
        map.put("skus", skuMap);
        return map;
    }

    // ---- small helpers ----

    private static boolean flag(Boolean value, boolean fallback) {
        return value != null ? value : fallback;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static void requireText(String value, String label, int max) {
        if (value == null || value.isBlank()) {
            throw invalid(label + " không được để trống.");
        }
        maxLength(value, label, max);
    }

    private static void maxLength(String value, String label, int max) {
        if (value != null && value.length() > max) {
            throw invalid(label + " tối đa " + max + " ký tự.");
        }
    }

    private static void checkVersion(Long incoming, long stored) {
        if (incoming != null && incoming != stored) {
            throw DomainException.conflict(ProblemCode.VERSION_CONFLICT,
                    "Dữ liệu đã bị người khác thay đổi. Tải lại để tiếp tục.");
        }
    }

    private static DomainException invalid(String detail) {
        return DomainException.badRequest(ProblemCode.VALIDATION_FAILED, detail);
    }
}
