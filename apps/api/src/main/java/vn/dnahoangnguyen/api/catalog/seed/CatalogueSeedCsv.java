package vn.dnahoangnguyen.api.catalog.seed;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

/** Strict RFC 4180 reader of the catalogue seed file. Codes are read verbatim, never normalised. */
public final class CatalogueSeedCsv {

    public static final List<String> HEADER = List.of("product_key", "product_name", "brand", "category_l1",
            "category_l2", "code", "sku_name", "unit_name", "conversion", "is_base", "price", "price_visible",
            "needs_confirmation", "spec");

    public record SeedRow(String productKey, String productName, String brand, String categoryL1, String categoryL2,
                          String code, String skuName, String unitName, int conversion, boolean isBase, long price,
                          boolean priceVisible, boolean needsConfirmation, String spec) {
    }

    private CatalogueSeedCsv() {
    }

    public static List<SeedRow> parse(InputStream in) throws IOException {
        try (Reader reader = new InputStreamReader(in, StandardCharsets.UTF_8)) {
            CSVFormat format = CSVFormat.RFC4180.builder().setHeader().setSkipHeaderRecord(true).get();
            try (CSVParser parser = format.parse(reader)) {
                if (!HEADER.equals(parser.getHeaderNames())) {
                    throw new IllegalStateException("Unexpected catalogue seed header: " + parser.getHeaderNames());
                }
                List<SeedRow> rows = new ArrayList<>();
                for (CSVRecord record : parser) {
                    rows.add(toRow(record));
                }
                return rows;
            }
        }
    }

    private static SeedRow toRow(CSVRecord r) {
        try {
            return new SeedRow(
                    required(r, "product_key"), required(r, "product_name"), required(r, "brand"),
                    required(r, "category_l1"), optional(r, "category_l2"),
                    required(r, "code"), optional(r, "sku_name"), required(r, "unit_name"),
                    Integer.parseInt(required(r, "conversion")), bool(r, "is_base"),
                    Long.parseLong(required(r, "price")), bool(r, "price_visible"), bool(r, "needs_confirmation"),
                    optional(r, "spec"));
        } catch (RuntimeException e) {
            throw new IllegalStateException("Bad catalogue seed row " + r.getRecordNumber() + ": " + e.getMessage(), e);
        }
    }

    private static String required(CSVRecord r, String column) {
        String value = r.get(column);
        if (value == null || value.isEmpty()) {
            throw new IllegalArgumentException("column " + column + " is empty");
        }
        return value;
    }

    private static String optional(CSVRecord r, String column) {
        String value = r.get(column);
        return value == null || value.isEmpty() ? null : value;
    }

    private static boolean bool(CSVRecord r, String column) {
        String value = required(r, column);
        return switch (value) {
            case "true" -> true;
            case "false" -> false;
            default -> throw new IllegalArgumentException("column " + column + " must be true or false, was " + value);
        };
    }
}
