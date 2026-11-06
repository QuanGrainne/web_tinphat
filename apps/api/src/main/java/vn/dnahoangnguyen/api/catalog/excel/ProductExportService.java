package vn.dnahoangnguyen.api.catalog.excel;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.dnahoangnguyen.api.catalog.category.Category;
import vn.dnahoangnguyen.api.catalog.category.CategoryRepository;
import vn.dnahoangnguyen.api.catalog.product.Product;
import vn.dnahoangnguyen.api.catalog.product.ProductRepository;
import vn.dnahoangnguyen.api.catalog.product.ProductStatus;
import vn.dnahoangnguyen.api.catalog.sku.Sku;
import vn.dnahoangnguyen.api.catalog.sku.SkuRepository;

/** Writes products with KiotViet's column names, so the file can be edited in Excel and imported here again. */
@Service
public class ProductExportService {

    private static final String[] HEADERS = {"Loại hàng", "Nhóm hàng(3 Cấp)", "Mã hàng", "Tên hàng", "Giá bán", "ĐVT",
            "Hình ảnh (url1,url2...)", "Đang kinh doanh", "Mô tả"};
    private static final int[] WIDTHS = {12, 26, 16, 44, 12, 20, 60, 16, 50};

    private final ProductRepository products;
    private final SkuRepository skus;
    private final CategoryRepository categories;
    private final String siteUrl;

    public ProductExportService(ProductRepository products, SkuRepository skus, CategoryRepository categories,
                                @Value("${dna.site-url:http://localhost:8000}") String siteUrl) {
        this.products = products;
        this.skus = skus;
        this.categories = categories;
        this.siteUrl = siteUrl.replaceAll("/+$", "");
    }

    @Transactional(readOnly = true)
    public byte[] export(Long categoryId) {
        return export(categoryId, null);
    }

    /**
     * @param categoryId only this category and its children; null for every product
     * @param ids only these products (the ones ticked in the list); null for no such limit
     */
    @Transactional(readOnly = true)
    public byte[] export(Long categoryId, List<Long> ids) {
        Map<Long, Category> byId = categories.findAll().stream().collect(Collectors.toMap(Category::getId, c -> c));
        Set<Long> wanted = ids == null ? Set.of() : Set.copyOf(ids);
        List<Product> selected = products.findAll().stream()
                .filter(p -> categoryId == null || inTree(p.getCategoryId(), categoryId, byId))
                .filter(p -> ids == null || wanted.contains(p.getId()))
                .sorted(Comparator.comparing((Product p) -> categoryPath(p.getCategoryId(), byId)).thenComparing(Product::getName))
                .toList();
        Map<Long, Sku> baseSkus = skus.findByProductIdIn(selected.stream().map(Product::getId).toList()).stream()
                .filter(Sku::isBase).collect(Collectors.toMap(Sku::getProductId, s -> s));

        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XSSFSheet sheet = workbook.createSheet("Sản phẩm");
            writeHeader(workbook, sheet);
            int index = 1;
            for (Product product : selected) {
                Sku base = baseSkus.get(product.getId());
                if (base == null) {
                    continue;
                }
                Row row = sheet.createRow(index++);
                row.createCell(0).setCellValue("Hàng hóa");
                row.createCell(1).setCellValue(categoryPath(product.getCategoryId(), byId));
                row.createCell(2).setCellValue(base.getCode());
                row.createCell(3).setCellValue(product.getName());
                if (base.getPrice() != null) {
                    row.createCell(4).setCellValue(base.getPrice());
                } else {
                    row.createCell(4).setCellValue(0);
                }
                row.createCell(5).setCellValue(base.getUnitName());
                row.createCell(6).setCellValue(String.join(",", images(product)));
                row.createCell(7).setCellValue(product.getStatus() == ProductStatus.ACTIVE ? 1 : 0);
                row.createCell(8).setCellValue(product.getDescriptionMd() == null ? "" : product.getDescriptionMd());
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Could not build the export file", e);
        }
    }

    private static void writeHeader(XSSFWorkbook workbook, XSSFSheet sheet) {
        Font bold = workbook.createFont();
        bold.setBold(true);
        XSSFCellStyle style = workbook.createCellStyle();
        style.setFont(bold);
        Row header = sheet.createRow(0);
        for (int i = 0; i < HEADERS.length; i++) {
            header.createCell(i).setCellValue(HEADERS[i]);
            header.getCell(i).setCellStyle(style);
            sheet.setColumnWidth(i, WIDTHS[i] * 256);
        }
        sheet.createFreezePane(0, 1);
    }

    /** Uploaded images get the site address, because the import only takes full links. */
    private List<String> images(Product product) {
        List<String> urls = new ArrayList<>();
        if (product.getImageUrl() != null) {
            urls.add(product.getImageUrl());
        }
        urls.addAll(product.getGalleryUrls());
        return urls.stream().map(url -> url.startsWith("/") ? siteUrl + url : url).toList();
    }

    private static boolean inTree(Long id, long root, Map<Long, Category> byId) {
        if (id == null) {
            return false;
        }
        Category category = byId.get(id);
        return id == root || (category != null && Long.valueOf(root).equals(category.getParentId()));
    }

    private static String categoryPath(Long id, Map<Long, Category> byId) {
        Category category = id == null ? null : byId.get(id);
        if (category == null) {
            return "";
        }
        Category parent = category.getParentId() == null ? null : byId.get(category.getParentId());
        return parent == null ? category.getName() : parent.getName() + ">>" + category.getName();
    }
}
