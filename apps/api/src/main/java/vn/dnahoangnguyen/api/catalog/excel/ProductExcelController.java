package vn.dnahoangnguyen.api.catalog.excel;

import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import vn.dnahoangnguyen.api.catalog.excel.ProductImportService.ImportPreview;
import vn.dnahoangnguyen.api.catalog.excel.ProductImportService.ImportResult;
import vn.dnahoangnguyen.api.catalog.product.ChangeActor;

/** Excel import and export of the catalogue from the admin product list. */
@RestController
@RequestMapping("/api/admin")
public class ProductExcelController {

    private static final MediaType XLSX = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final ProductImportService imports;
    private final ProductExportService exports;

    public ProductExcelController(ProductImportService imports, ProductExportService exports) {
        this.imports = imports;
        this.exports = exports;
    }

    @PostMapping("/imports/products/preview")
    public ImportPreview preview(@RequestParam("file") MultipartFile file,
                                 @RequestParam(name = "categoryId", required = false) Long categoryId) {
        return imports.preview(file, categoryId);
    }

    @PostMapping("/imports/products")
    public ImportResult run(@RequestParam("file") MultipartFile file,
                            @RequestParam(name = "categoryId", required = false) Long categoryId,
                            @RequestParam(name = "publish", defaultValue = "true") boolean publish,
                            @RequestParam(name = "update", defaultValue = "true") boolean update) {
        return imports.run(file, categoryId, publish, update, ChangeActor.current());
    }

    @GetMapping("/exports/products")
    public ResponseEntity<byte[]> export(@RequestParam(name = "categoryId", required = false) Long categoryId) {
        return file(exports.export(categoryId));
    }

    public record ExportSelection(List<Long> ids) {
    }

    /** The ticked products; POST because a long selection would not fit in a URL. */
    @PostMapping("/exports/products")
    public ResponseEntity<byte[]> exportSelected(@RequestBody ExportSelection body) {
        return file(exports.export(null, body.ids() == null ? List.of() : body.ids()));
    }

    private static ResponseEntity<byte[]> file(byte[] content) {
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"san-pham-tin-phat.xlsx\"")
                .body(content);
    }
}
