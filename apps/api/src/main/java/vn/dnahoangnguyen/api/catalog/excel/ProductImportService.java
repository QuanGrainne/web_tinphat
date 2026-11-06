package vn.dnahoangnguyen.api.catalog.excel;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import vn.dnahoangnguyen.api.catalog.category.Category;
import vn.dnahoangnguyen.api.catalog.category.CategoryRepository;
import vn.dnahoangnguyen.api.catalog.category.CategoryService;
import vn.dnahoangnguyen.api.catalog.excel.ProductExcelReader.ExcelRow;
import vn.dnahoangnguyen.api.catalog.product.ChangeActor;
import vn.dnahoangnguyen.api.catalog.product.ChangeSource;
import vn.dnahoangnguyen.api.catalog.product.ProductAdminService;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminProduct;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminSku;
import vn.dnahoangnguyen.api.catalog.product.ProductService;
import vn.dnahoangnguyen.api.catalog.sku.Sku;
import vn.dnahoangnguyen.api.catalog.sku.SkuCodeKey;
import vn.dnahoangnguyen.api.catalog.sku.SkuRepository;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;

/**
 * Bulk import from Excel. The preview writes nothing. The import saves each row through the normal product write path in
 * its own transaction, so one bad row is reported and the others still go in.
 */
@Service
public class ProductImportService {

    public enum RowAction { CREATE, UPDATE, SKIP, ERROR }

    public record PreviewRow(int row, String code, String name, String category, Long price, String unit, String imageUrl,
                             int imageCount, RowAction action, String message) {
    }

    public record ImportPreview(List<PreviewRow> rows, long create, long update, long skip, long error) {
    }

    public record RowProblem(int row, String code, String message) {
    }

    public record ImportResult(int created, int updated, int skipped, List<RowProblem> errors) {
    }

    private record PlannedRow(ExcelRow source, RowAction action, String message, Long productId) {
    }

    private static final long MAX_BYTES = 5L * 1024 * 1024;

    private final ProductService products;
    private final ProductAdminService reader;
    private final SkuRepository skus;
    private final CategoryService categoryService;
    private final CategoryRepository categories;

    public ProductImportService(ProductService products, ProductAdminService reader, SkuRepository skus,
                                CategoryService categoryService, CategoryRepository categories) {
        this.products = products;
        this.reader = reader;
        this.skus = skus;
        this.categoryService = categoryService;
        this.categories = categories;
    }

    public ImportPreview preview(MultipartFile file, Long categoryId) {
        Category target = target(categoryId);
        List<PreviewRow> rows = plan(read(file), target).stream().map(p -> {
            ExcelRow r = p.source();
            return new PreviewRow(r.rowNumber(), r.code(), r.name(), target != null ? target.getName() : String.join(" > ", r.categoryPath()),
                    r.price(), r.unit(), r.imageUrls().isEmpty() ? null : r.imageUrls().get(0), r.imageUrls().size(), p.action(), p.message());
        }).toList();
        Map<RowAction, Long> counts = rows.stream().collect(Collectors.groupingBy(PreviewRow::action, Collectors.counting()));
        return new ImportPreview(rows, counts.getOrDefault(RowAction.CREATE, 0L), counts.getOrDefault(RowAction.UPDATE, 0L),
                counts.getOrDefault(RowAction.SKIP, 0L), counts.getOrDefault(RowAction.ERROR, 0L));
    }

    public ImportResult run(MultipartFile file, Long categoryId, boolean publish, boolean updateExisting, ChangeActor actor) {
        actor.requireManager("import", "Chỉ quản lý được import sản phẩm.");
        Category target = target(categoryId);
        int created = 0;
        int updated = 0;
        int skipped = 0;
        List<RowProblem> errors = new ArrayList<>();
        Map<List<String>, Long> categoryIds = new HashMap<>();
        for (PlannedRow planned : plan(read(file), target)) {
            ExcelRow row = planned.source();
            if (planned.action() == RowAction.ERROR) {
                errors.add(new RowProblem(row.rowNumber(), row.code(), planned.message()));
                continue;
            }
            if (planned.action() == RowAction.SKIP || (planned.action() == RowAction.UPDATE && !updateExisting)) {
                skipped++;
                continue;
            }
            try {
                long category = target != null ? target.getId() : categoryIds.computeIfAbsent(row.categoryPath(), this::resolveCategory);
                if (planned.action() == RowAction.CREATE) {
                    long id = products.saveAggregate(null, newProduct(row, category), actor, ChangeSource.MANUAL);
                    if (publish && row.active()) {
                        products.publish(id, actor);
                    }
                    created++;
                } else {
                    AdminProduct stored = reader.get(planned.productId());
                    products.saveAggregate(stored.id(), updatedProduct(stored, row, category), actor, ChangeSource.MANUAL);
                    if (publish && row.active() && !stored.published()) {
                        products.publish(stored.id(), actor);
                    }
                    updated++;
                }
            } catch (DomainException e) {
                errors.add(new RowProblem(row.rowNumber(), row.code(), e.getMessage()));
            }
        }
        return new ImportResult(created, updated, skipped, errors);
    }

    private List<ExcelRow> read(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw invalid("Chưa chọn file.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw invalid("File tối đa 5 MB.");
        }
        try (InputStream in = file.getInputStream()) {
            return ProductExcelReader.read(in);
        } catch (IOException e) {
            throw new IllegalStateException("Could not read the uploaded file", e);
        }
    }

    private Category target(Long categoryId) {
        if (categoryId == null) {
            return null;
        }
        return categories.findById(categoryId).orElseThrow(() -> invalid("Danh mục không tồn tại."));
    }

    private List<PlannedRow> plan(List<ExcelRow> rows, Category target) {
        Map<String, Sku> stored = skus.findByCodeKeyIn(rows.stream().filter(r -> !r.code().isEmpty()).map(r -> SkuCodeKey.of(r.code())).toList())
                .stream().collect(Collectors.toMap(Sku::getCodeKey, s -> s));
        Set<String> seen = new HashSet<>();
        List<PlannedRow> planned = new ArrayList<>();
        for (ExcelRow row : rows) {
            if (row.problem() != null) {
                planned.add(new PlannedRow(row, RowAction.ERROR, row.problem(), null));
            } else if (row.skipReason() != null) {
                planned.add(new PlannedRow(row, RowAction.SKIP, row.skipReason(), null));
            } else if (!seen.add(SkuCodeKey.of(row.code()))) {
                planned.add(new PlannedRow(row, RowAction.ERROR, "Mã hàng bị trùng trong file.", null));
            } else if (target == null && row.categoryPath().isEmpty()) {
                planned.add(new PlannedRow(row, RowAction.ERROR, "Chưa có danh mục. Hãy chọn danh mục để import vào.", null));
            } else {
                Sku sku = stored.get(SkuCodeKey.of(row.code()));
                planned.add(sku == null ? new PlannedRow(row, RowAction.CREATE, null, null)
                        : new PlannedRow(row, RowAction.UPDATE, null, sku.getProductId()));
            }
        }
        return planned;
    }

    private long resolveCategory(List<String> path) {
        Category root = categoryService.findOrCreate(path.get(0), null);
        return path.size() == 1 ? root.getId() : categoryService.findOrCreate(path.get(1), root.getId()).getId();
    }

    private static AdminProduct newProduct(ExcelRow row, long category) {
        AdminSku sku = new AdminSku(null, null, row.code(), null, row.unit(), 1, true, row.price(), true, false, null, null, null,
                true, null, null, null);
        return new AdminProduct(null, null, row.name(), null, null, category, blankToNull(row.description()), row.unit(), cover(row),
                null, null, null, null, null, List.of(sku), null, null, gallery(row));
    }

    /** A row without a price, image or description keeps what the web already has; KiotViet often leaves them empty. */
    private static AdminProduct updatedProduct(AdminProduct s, ExcelRow row, long category) {
        String key = SkuCodeKey.of(row.code());
        List<AdminSku> rows = s.skus().stream().map(k -> !SkuCodeKey.of(k.code()).equals(key) || row.price() == null ? k
                : new AdminSku(k.id(), k.version(), k.code(), k.name(), k.unitName(), k.conversion(), k.isBase(), row.price(), k.priceVisible(),
                        k.needsConfirmation(), k.promoPrice(), k.promoFrom(), k.promoTo(), k.visible(), k.source(), null, null)).toList();
        boolean hasImages = !row.imageUrls().isEmpty();
        return new AdminProduct(s.id(), s.version(), row.name(), s.slug(), s.brandId(), category,
                row.description().isEmpty() ? s.descriptionMd() : row.description(), s.specLine(), hasImages ? cover(row) : s.imageUrl(),
                s.seoTitle(), s.seoDescription(), s.internalNote(), s.published(), s.status(), rows, null, null,
                hasImages ? gallery(row) : null);
    }

    private static String cover(ExcelRow row) {
        return row.imageUrls().isEmpty() ? null : row.imageUrls().get(0);
    }

    private static List<String> gallery(ExcelRow row) {
        return row.imageUrls().isEmpty() ? List.of() : row.imageUrls().subList(1, row.imageUrls().size());
    }

    private static String blankToNull(String value) {
        return value.isEmpty() ? null : value;
    }

    private static DomainException invalid(String detail) {
        return DomainException.badRequest(ProblemCode.VALIDATION_FAILED, detail);
    }
}
