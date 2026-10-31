package vn.dnahoangnguyen.api.catalog.sku;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import vn.dnahoangnguyen.api.catalog.pricing.SkuPricing;

/** One sellable unit of a product (for example "Thùng 50 gói"). Exactly one SKU per product is the base unit. */
@Entity
@Table(name = "sku")
public class Sku {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    /** Shown verbatim to staff and customers. */
    @Column(name = "code", nullable = false)
    private String code;

    /** Normalised {@link SkuCodeKey#of(String)} of the code; the uniqueness key. */
    @Column(name = "code_key", nullable = false)
    private String codeKey;

    @Column(name = "name")
    private String name;

    @Column(name = "unit_name", nullable = false)
    private String unitName;

    @Column(name = "conversion", nullable = false)
    private int conversion = 1;

    @Column(name = "is_base", nullable = false)
    private boolean base;

    @Column(name = "price")
    private Long price;

    @Column(name = "price_visible", nullable = false)
    private boolean priceVisible = true;

    @Column(name = "needs_confirmation", nullable = false)
    private boolean needsConfirmation;

    @Column(name = "promo_price")
    private Long promoPrice;

    @Column(name = "promo_from")
    private LocalDate promoFrom;

    @Column(name = "promo_to")
    private LocalDate promoTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false)
    private SkuSource source = SkuSource.MANUAL;

    @Column(name = "visible", nullable = false)
    private boolean visible = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Sku() {
    }

    public SkuPricing pricing() {
        return new SkuPricing(price, promoPrice, promoFrom, promoTo);
    }

    public Long getId() {
        return id;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getCode() {
        return code;
    }

    public String getCodeKey() {
        return codeKey;
    }

    /** Sets the verbatim code and derives its uniqueness key. */
    public void setCode(String code) {
        this.code = code;
        this.codeKey = SkuCodeKey.of(code);
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUnitName() {
        return unitName;
    }

    public void setUnitName(String unitName) {
        this.unitName = unitName;
    }

    public int getConversion() {
        return conversion;
    }

    public void setConversion(int conversion) {
        this.conversion = conversion;
    }

    public boolean isBase() {
        return base;
    }

    public void setBase(boolean base) {
        this.base = base;
    }

    public Long getPrice() {
        return price;
    }

    public void setPrice(Long price) {
        this.price = price;
    }

    public boolean isPriceVisible() {
        return priceVisible;
    }

    public void setPriceVisible(boolean priceVisible) {
        this.priceVisible = priceVisible;
    }

    public boolean isNeedsConfirmation() {
        return needsConfirmation;
    }

    public void setNeedsConfirmation(boolean needsConfirmation) {
        this.needsConfirmation = needsConfirmation;
    }

    public Long getPromoPrice() {
        return promoPrice;
    }

    public void setPromoPrice(Long promoPrice) {
        this.promoPrice = promoPrice;
    }

    public LocalDate getPromoFrom() {
        return promoFrom;
    }

    public void setPromoFrom(LocalDate promoFrom) {
        this.promoFrom = promoFrom;
    }

    public LocalDate getPromoTo() {
        return promoTo;
    }

    public void setPromoTo(LocalDate promoTo) {
        this.promoTo = promoTo;
    }

    public SkuSource getSource() {
        return source;
    }

    public void setSource(SkuSource source) {
        this.source = source;
    }

    public boolean isVisible() {
        return visible;
    }

    public void setVisible(boolean visible) {
        this.visible = visible;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public long getVersion() {
        return version;
    }
}
