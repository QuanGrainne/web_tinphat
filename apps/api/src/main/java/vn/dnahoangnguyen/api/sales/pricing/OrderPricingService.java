package vn.dnahoangnguyen.api.sales.pricing;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.dnahoangnguyen.api.sales.SalesErrors;
import vn.dnahoangnguyen.api.sales.Vnd;
import vn.dnahoangnguyen.api.settings.DiscountTier;
import vn.dnahoangnguyen.api.settings.SettingsService;

/**
 * Server-side pricing of a basket: the browser's prices are never trusted. Reads SKU and product rows directly
 * so the sales module does not depend on the catalogue code.
 */
@Service
public class OrderPricingService {

    public static final int MAX_LINES = 50;
    public static final int MAX_QTY = 9_999;

    /** The columns pricing needs from {@code sku} joined to {@code product}. */
    record SkuRow(
            long id, String code, String unitName, int conversion, Long price, boolean priceVisible,
            Long promoPrice, LocalDate promoFrom, LocalDate promoTo, boolean visible,
            String productName, String productSlug, boolean published, String productStatus) {

        boolean sellable() {
            return visible && published && "ACTIVE".equals(productStatus);
        }
    }

    private final JdbcClient jdbc;
    private final SettingsService settings;
    private final Clock clock;

    public OrderPricingService(JdbcClient jdbc, SettingsService settings, Clock clock) {
        this.jdbc = jdbc;
        this.settings = settings;
        this.clock = clock;
    }

    /** Reprices the basket as of today (business time zone). Duplicate SKUs are merged. */
    @Transactional(readOnly = true)
    public PricedCart price(List<CartLineIn> input) {
        Map<Long, Integer> merged = merge(input);
        Map<Long, SkuRow> rows = merged.isEmpty() ? Map.of() : load(merged.keySet());
        return compute(merged, rows, settings.discountTiers(), LocalDate.now(clock));
    }

    /** Validates bounds and merges duplicate SKUs, keeping the first-seen order. */
    static Map<Long, Integer> merge(List<CartLineIn> input) {
        Map<Long, Integer> merged = new LinkedHashMap<>();
        if (input == null) {
            return merged;
        }
        for (CartLineIn line : input) {
            if (line == null || line.skuId() == null || line.qty() == null || line.qty() < 1 || line.qty() > MAX_QTY) {
                throw SalesErrors.invalidField("lines", "Số lượng mỗi sản phẩm phải từ 1 đến 9.999.");
            }
            int qty = merged.merge(line.skuId(), line.qty(), Integer::sum);
            if (qty > MAX_QTY) {
                throw SalesErrors.invalidField("lines", "Số lượng mỗi sản phẩm phải từ 1 đến 9.999.");
            }
        }
        if (merged.size() > MAX_LINES) {
            throw SalesErrors.invalidField("lines", "Tối đa " + MAX_LINES + " sản phẩm trong một đơn.");
        }
        return merged;
    }

    /** Pure pricing of already loaded rows. */
    static PricedCart compute(Map<Long, Integer> qtyBySku, Map<Long, SkuRow> rows, List<DiscountTier> tiers,
                              LocalDate today) {
        List<PricedLine> lines = new ArrayList<>();
        long subtotal = 0;
        boolean hasContactLines = false;
        for (Map.Entry<Long, Integer> entry : qtyBySku.entrySet()) {
            long skuId = entry.getKey();
            int qty = entry.getValue();
            SkuRow row = rows.get(skuId);
            if (row == null || !row.sellable()) {
                lines.add(PricedLine.unavailable(skuId, qty));
                continue;
            }
            boolean priced = row.priceVisible() && row.price() != null;
            if (!priced) {
                hasContactLines = true;
                lines.add(new PricedLine(skuId, false, row.code(), row.productName(), row.productSlug(), row.unitName(),
                        row.conversion(), qty, false, false, null, null, null));
                continue;
            }
            long unit = effectivePrice(row, today);
            long lineTotal = unit * qty;
            subtotal += lineTotal;
            lines.add(new PricedLine(skuId, false, row.code(), row.productName(), row.productSlug(), row.unitName(),
                    row.conversion(), qty, true, true, row.price(), unit, lineTotal));
        }
        DiscountTier tier = tierFor(subtotal, tiers);
        long discount = tier == null ? 0 : discountOf(subtotal, tier.pct());
        String note = discount > 0
                ? "Ưu đãi " + Vnd.percent(tier.pct()) + "% cho đơn từ " + Vnd.format(tier.threshold())
                : null;
        return new PricedCart(List.copyOf(lines), subtotal, discount, note, subtotal - discount, hasContactLines);
    }

    /** Promotion price while the promotion is active (inclusive dates), otherwise the regular price. */
    static long effectivePrice(SkuRow row, LocalDate today) {
        boolean promoActive = row.promoPrice() != null
                && (row.promoFrom() == null || !today.isBefore(row.promoFrom()))
                && (row.promoTo() == null || !today.isAfter(row.promoTo()));
        return promoActive ? row.promoPrice() : row.price();
    }

    /** Highest tier whose threshold is at most the subtotal; {@code null} when none applies. */
    static DiscountTier tierFor(long subtotal, List<DiscountTier> tiers) {
        DiscountTier best = null;
        for (DiscountTier tier : tiers) {
            if (tier.threshold() <= subtotal && (best == null || tier.threshold() > best.threshold())) {
                best = tier;
            }
        }
        return best;
    }

    static long discountOf(long subtotal, double pct) {
        return BigDecimal.valueOf(subtotal).multiply(BigDecimal.valueOf(pct))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).longValueExact();
    }

    private Map<Long, SkuRow> load(java.util.Set<Long> ids) {
        List<SkuRow> rows = jdbc.sql("""
                select s.id, s.code, s.unit_name, s.conversion, s.price, s.price_visible,
                       s.promo_price, s.promo_from, s.promo_to, s.visible,
                       p.name as product_name, p.slug as product_slug, p.published, p.status as product_status
                from sku s join product p on p.id = s.product_id
                where s.id in (:ids)
                """)
                .param("ids", ids)
                .query((rs, n) -> new SkuRow(
                        rs.getLong("id"), rs.getString("code"), rs.getString("unit_name"), rs.getInt("conversion"),
                        nullableLong(rs.getObject("price")), rs.getBoolean("price_visible"),
                        nullableLong(rs.getObject("promo_price")), toLocalDate(rs.getDate("promo_from")),
                        toLocalDate(rs.getDate("promo_to")), rs.getBoolean("visible"),
                        rs.getString("product_name"), rs.getString("product_slug"), rs.getBoolean("published"),
                        rs.getString("product_status")))
                .list();
        Map<Long, SkuRow> byId = new LinkedHashMap<>();
        rows.forEach(r -> byId.put(r.id(), r));
        return byId;
    }

    private static Long nullableLong(Object value) {
        return value == null ? null : ((Number) value).longValue();
    }

    private static LocalDate toLocalDate(Date date) {
        return date == null ? null : date.toLocalDate();
    }
}
