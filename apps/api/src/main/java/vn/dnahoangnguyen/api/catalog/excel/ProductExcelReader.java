package vn.dnahoangnguyen.api.catalog.excel;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;

/**
 * Reads a KiotViet product export (or a file exported by this site). Columns are found by their header, so their order
 * and any extra columns do not matter. One sheet row is one web product: a KiotViet variant has its own code and photo.
 */
final class ProductExcelReader {

    /** One product row. {@code skipReason} marks rows the import leaves out, such as a secondary unit of a product. */
    record ExcelRow(int rowNumber, String code, String name, List<String> categoryPath, Long price, String unit,
                    List<String> imageUrls, String description, boolean active, String problem, String skipReason) {
    }

    static final String DEFAULT_UNIT = "Sản phẩm";
    static final int MAX_IMAGES = 5;
    private static final int MAX_ROWS = 5000;
    private static final int MAX_URL = 500;
    private static final DataFormatter FORMATTER = new DataFormatter();

    private ProductExcelReader() {
    }

    static List<ExcelRow> read(InputStream in) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(in)) {
            return read(workbook.getSheetAt(0));
        } catch (IOException | RuntimeException e) {
            if (e instanceof DomainException domain) {
                throw domain;
            }
            throw invalid("Không đọc được file. Hãy chọn file Excel (.xlsx) xuất từ KiotViet hoặc từ trang này.");
        }
    }

    private static List<ExcelRow> read(Sheet sheet) {
        Row header = sheet.getRow(sheet.getFirstRowNum());
        Map<String, Integer> columns = header == null ? Map.of() : columns(header);
        Integer code = column(columns, "mã hàng");
        Integer name = column(columns, "tên hàng");
        if (code == null || name == null) {
            throw invalid("File thiếu cột \"Mã hàng\" hoặc \"Tên hàng\".");
        }
        Integer category = column(columns, "nhóm hàng");
        Integer price = column(columns, "giá bán");
        Integer unit = column(columns, "đvt");
        Integer baseUnitCode = column(columns, "mã đvt cơ bản");
        Integer attributes = column(columns, "thuộc tính");
        Integer images = column(columns, "hình ảnh");
        Integer description = column(columns, "mô tả");
        Integer active = column(columns, "đang kinh doanh");

        List<ExcelRow> rows = new ArrayList<>();
        for (int i = sheet.getFirstRowNum() + 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            String rawCode = text(row, code);
            String rawName = text(row, name);
            if (rawCode.isEmpty() && rawName.isEmpty()) {
                continue;
            }
            if (rows.size() == MAX_ROWS) {
                throw invalid("Mỗi lần import tối đa " + MAX_ROWS + " dòng.");
            }
            String problem = rawCode.isEmpty() ? "Thiếu mã hàng." : rawName.isEmpty() ? "Thiếu tên hàng." : null;
            String priceText = text(row, price);
            Long parsedPrice = null;
            try {
                parsedPrice = parsePrice(priceText);
            } catch (NumberFormatException e) {
                problem = problem != null ? problem : "Giá bán \"" + priceText + "\" không hợp lệ.";
            }
            String rawUnit = text(row, unit);
            rows.add(new ExcelRow(i + 1, rawCode, withVariant(rawName, text(row, attributes)), categoryPath(text(row, category)),
                    parsedPrice, rawUnit.isEmpty() ? DEFAULT_UNIT : rawUnit, imageUrls(text(row, images)), text(row, description),
                    !"0".equals(text(row, active)), problem,
                    text(row, baseUnitCode).isEmpty() ? null : "Đơn vị quy đổi của mã " + text(row, baseUnitCode) + ", không import."));
        }
        return rows;
    }

    private static Map<String, Integer> columns(Row header) {
        Map<String, Integer> columns = new HashMap<>();
        for (Cell cell : header) {
            columns.put(FORMATTER.formatCellValue(cell).strip().toLowerCase(Locale.ROOT), cell.getColumnIndex());
        }
        return columns;
    }

    /** Exact header first, then a prefix: KiotViet writes "Nhóm hàng(3 Cấp)" and "Hình ảnh (url1,url2...)". */
    private static Integer column(Map<String, Integer> columns, String name) {
        Integer exact = columns.get(name);
        if (exact != null) {
            return exact;
        }
        return columns.entrySet().stream().filter(e -> e.getKey().startsWith(name + "(") || e.getKey().startsWith(name + " ("))
                .map(Map.Entry::getValue).findFirst().orElse(null);
    }

    private static String text(Row row, Integer column) {
        if (row == null || column == null) {
            return "";
        }
        Cell cell = row.getCell(column);
        if (cell == null) {
            return "";
        }
        return switch (cell.getCellType()) {
            case NUMERIC -> BigDecimal.valueOf(cell.getNumericCellValue()).stripTrailingZeros().toPlainString();
            case STRING -> cell.getStringCellValue().strip();
            default -> FORMATTER.formatCellValue(cell).strip();
        };
    }

    /** KiotViet writes 0 for a product without a price; the web shows "Liên hệ" for those. */
    static Long parsePrice(String text) {
        if (text.isEmpty()) {
            return null;
        }
        long price = new BigDecimal(text).setScale(0, RoundingMode.HALF_UP).longValueExact();
        return price > 0 ? price : null;
    }

    /** "Tag treo tết" + "LOẠI:dê đội mũ" gives "Tag treo tết - dê đội mũ", so variants differ on the web. */
    static String withVariant(String name, String attributes) {
        if (name.isEmpty() || attributes.isEmpty()) {
            return name;
        }
        StringBuilder result = new StringBuilder(name);
        for (String attribute : attributes.split("\\|")) {
            String value = attribute.substring(attribute.indexOf(':') + 1).strip();
            if (!value.isEmpty()) {
                result.append(" - ").append(value);
            }
        }
        return result.toString();
    }

    /** KiotViet joins levels with ">>"; the site has two levels, so anything deeper stays with the second. */
    static List<String> categoryPath(String text) {
        List<String> path = Arrays.stream(text.split(">>")).map(String::strip).filter(s -> !s.isEmpty()).toList();
        return path.size() > 2 ? path.subList(0, 2) : path;
    }

    static List<String> imageUrls(String text) {
        return Arrays.stream(text.split(",")).map(String::strip)
                .filter(url -> (url.startsWith("https://") || url.startsWith("http://")) && url.length() <= MAX_URL)
                .distinct().limit(MAX_IMAGES).toList();
    }

    private static DomainException invalid(String detail) {
        return DomainException.badRequest(ProblemCode.VALIDATION_FAILED, detail);
    }
}
