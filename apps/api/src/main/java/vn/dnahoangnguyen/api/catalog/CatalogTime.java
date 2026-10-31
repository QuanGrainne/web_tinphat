package vn.dnahoangnguyen.api.catalog;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import vn.dnahoangnguyen.api.catalog.pricing.PriceRules;

/** ISO-8601 timestamps with the business-zone offset, as the API contract expects. */
public final class CatalogTime {

    private CatalogTime() {
    }

    public static String iso(Instant instant) {
        return instant == null ? null : DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(instant.atZone(PriceRules.ZONE));
    }
}
