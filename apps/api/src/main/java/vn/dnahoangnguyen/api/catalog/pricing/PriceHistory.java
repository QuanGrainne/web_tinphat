package vn.dnahoangnguyen.api.catalog.pricing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import org.hibernate.annotations.CreationTimestamp;
import vn.dnahoangnguyen.api.catalog.product.ChangeSource;

/** Append-only record of a regular price or promo change. */
@Entity
@Table(name = "price_history")
public class PriceHistory {

    public enum Field {
        PRICE,
        PROMO
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sku_id", nullable = false)
    private Long skuId;

    @Enumerated(EnumType.STRING)
    @Column(name = "field", nullable = false)
    private Field field;

    @Column(name = "old_price")
    private Long oldPrice;

    @Column(name = "new_price")
    private Long newPrice;

    @Column(name = "promo_from")
    private LocalDate promoFrom;

    @Column(name = "promo_to")
    private LocalDate promoTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false)
    private ChangeSource source;

    @Column(name = "changed_by")
    private String changedBy;

    @CreationTimestamp
    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt;

    protected PriceHistory() {
    }

    public PriceHistory(Long skuId, Field field, Long oldPrice, Long newPrice, LocalDate promoFrom,
                        LocalDate promoTo, ChangeSource source, String changedBy) {
        this.skuId = skuId;
        this.field = field;
        this.oldPrice = oldPrice;
        this.newPrice = newPrice;
        this.promoFrom = promoFrom;
        this.promoTo = promoTo;
        this.source = source;
        this.changedBy = changedBy;
    }

    public Long getId() {
        return id;
    }

    public Long getSkuId() {
        return skuId;
    }

    public Field getField() {
        return field;
    }

    public Long getOldPrice() {
        return oldPrice;
    }

    public Long getNewPrice() {
        return newPrice;
    }

    public ChangeSource getSource() {
        return source;
    }

    public String getChangedBy() {
        return changedBy;
    }

    public Instant getChangedAt() {
        return changedAt;
    }
}
