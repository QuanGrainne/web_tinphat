package vn.dnahoangnguyen.api.catalog.excel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import vn.dnahoangnguyen.api.catalog.CatalogIntegrationTest;
import vn.dnahoangnguyen.api.catalog.excel.ProductImportService.ImportPreview;
import vn.dnahoangnguyen.api.catalog.excel.ProductImportService.ImportResult;
import vn.dnahoangnguyen.api.catalog.excel.ProductImportService.RowAction;
import vn.dnahoangnguyen.api.catalog.product.ChangeSource;
import vn.dnahoangnguyen.api.catalog.product.ProductAdminService;
import vn.dnahoangnguyen.api.common.error.DomainException;

class ProductExcelIT extends CatalogIntegrationTest {

    private static final String[] HEADERS = {"Loại hàng", "Nhóm hàng(3 Cấp)", "Mã hàng", "Tên hàng", "Giá bán", "ĐVT",
            "Mã ĐVT Cơ bản", "Thuộc tính", "Hình ảnh (url1,url2...)", "Đang kinh doanh"};

    @Autowired
    ProductImportService imports;
    @Autowired
    ProductExportService exports;
    @Autowired
    ProductAdminService reader;

    private static MockMultipartFile file(String[]... rows) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XSSFSheet sheet = workbook.createSheet("Hàng");
            Row header = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                header.createCell(i).setCellValue(HEADERS[i]);
            }
            for (int r = 0; r < rows.length; r++) {
                Row row = sheet.createRow(r + 1);
                for (int c = 0; c < rows[r].length; c++) {
                    row.createCell(c).setCellValue(rows[r][c]);
                }
            }
            workbook.write(out);
            return new MockMultipartFile("file", "hang.xlsx", null, out.toByteArray());
        }
    }

    private static String[] row(String group, String code, String name, String price, String attribute, String image) {
        return new String[] {"Hàng hóa", group, code, name, price, "chùm (10 bịch/chùm)", "", attribute, image, "1"};
    }

    @Test
    void previewWritesNothingAndClassifiesRows() throws IOException {
        ImportPreview preview = imports.preview(file(
                row("hàng tết", "A1", "Tag treo tết", "0.0000", "LOẠI:dê đội mũ", "https://cdn.example/a.jpg"),
                row("hàng tết", "A1", "Tag trùng", "0", "", ""),
                row("hàng tết", "", "Thiếu mã", "0", "", ""),
                row("hàng tết", "A2", "Giá lỗi", "abc", "", ""),
                new String[] {"Hàng hóa", "hàng tết", "A3", "Thùng", "0", "thùng", "A1", "", "", "1"}), null);

        assertThat(preview.rows()).extracting("action").containsExactly(RowAction.CREATE, RowAction.ERROR, RowAction.ERROR, RowAction.ERROR, RowAction.SKIP);
        assertThat(preview.rows().get(0).name()).isEqualTo("Tag treo tết - dê đội mũ");
        assertThat(preview.rows().get(0).price()).isNull();
        assertThat(count("select count(*) from product")).isZero();
        assertThat(count("select count(*) from category")).isZero();
    }

    @Test
    void importsIntoTheChosenCategoryPublishedWithPriceAndImage() throws IOException {
        long tet = categoryService.create(new vn.dnahoangnguyen.api.catalog.category.CategoryService.CategoryCreate("Tết", null)).id();

        ImportResult result = imports.run(file(
                row("hàng tết", "B1", "Đèn lồng", "13000.0000", "SIZE:S", "https://cdn.example/a.jpg, https://cdn.example/b.jpg"),
                row("hàng tết", "B2", "Kết điện", "0", "", "")), tet, true, true, MANAGER);

        assertThat(result.created()).isEqualTo(2);
        assertThat(result.errors()).isEmpty();
        assertThat(count("select count(*) from category")).isEqualTo(1);
        assertThat(count("select count(*) from product where published and category_id = " + tet)).isEqualTo(2);
        Long id = jdbc.queryForObject("select product_id from sku where code = 'B1'", Long.class);
        var stored = reader.get(id);
        assertThat(stored.name()).isEqualTo("Đèn lồng - S");
        assertThat(stored.skus().get(0).price()).isEqualTo(13_000L);
        assertThat(stored.imageUrl()).isEqualTo("https://cdn.example/a.jpg");
        assertThat(stored.galleryUrls()).containsExactly("https://cdn.example/b.jpg");
    }

    @Test
    void withoutAChosenCategoryTheFileGroupIsCreatedOnce() throws IOException {
        ImportResult result = imports.run(file(
                row("Noel>>Cây thông>>Nhỏ", "C1", "Cây 1", "0", "", ""),
                row("Noel>>Cây thông", "C2", "Cây 2", "0", "", ""),
                row("", "C3", "Không nhóm", "0", "", "")), null, false, true, MANAGER);

        assertThat(result.created()).isEqualTo(2);
        assertThat(result.errors()).hasSize(1);
        assertThat(count("select count(*) from category")).isEqualTo(2);
        assertThat(count("select count(*) from product where published")).isZero();
    }

    @Test
    void reimportUpdatesByCodeAndKeepsAWebPriceWhenTheFileHasNone() throws IOException {
        long group = categoryService.create(new vn.dnahoangnguyen.api.catalog.category.CategoryService.CategoryCreate("Nhóm", null)).id();
        long id = productService.saveAggregate(null, product("Tên cũ", null, group, sku("D1", "cái", 1, true, 30_000L)), MANAGER, ChangeSource.MANUAL);

        ImportResult result = imports.run(file(row("", "D1", "Tên mới", "0", "", "")), group, true, true, MANAGER);

        assertThat(result.updated()).isEqualTo(1);
        assertThat(reader.get(id).name()).isEqualTo("Tên mới");
        assertThat(reader.get(id).skus().get(0).price()).isEqualTo(30_000L);

        ImportResult skipped = imports.run(file(row("", "D1", "Tên khác", "5000", "", "")), group, true, false, MANAGER);
        assertThat(skipped.skipped()).isEqualTo(1);
        assertThat(reader.get(id).name()).isEqualTo("Tên mới");
    }

    @Test
    void onlyManagersImportAndAnEditorChangesNothing() throws IOException {
        var upload = file(row("g", "E1", "Tên", "0", "", ""));
        assertThatThrownBy(() -> imports.run(upload, null, true, true, EDITOR)).isInstanceOf(DomainException.class);
        assertThat(count("select count(*) from product")).isZero();
    }

    @Test
    void refusesAFileThatIsNotExcel() {
        var upload = new MockMultipartFile("file", "a.xlsx", null, "không phải excel".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        assertThatThrownBy(() -> imports.preview(upload, null)).isInstanceOf(DomainException.class);
    }

    @Test
    void anExportedFileCanBeImportedBack() throws IOException {
        long group = categoryService.create(new vn.dnahoangnguyen.api.catalog.category.CategoryService.CategoryCreate("Nhóm", null)).id();
        long other = categoryService.create(new vn.dnahoangnguyen.api.catalog.category.CategoryService.CategoryCreate("Khác", null)).id();
        create("Sản phẩm A", null, group, sku("F1", "cái", 1, true, 12_000L));
        create("Sản phẩm B", null, other, sku("F2", "cái", 1, true, null));

        byte[] all = exports.export(null);
        byte[] one = exports.export(group);
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(one))) {
            assertThat(workbook.getSheetAt(0).getLastRowNum()).isEqualTo(1);
            assertThat(workbook.getSheetAt(0).getRow(1).getCell(2).getStringCellValue()).isEqualTo("F1");
        }
        ImportPreview preview = imports.preview(new MockMultipartFile("file", "x.xlsx", null, all), null);
        assertThat(preview.update()).isEqualTo(2);
        assertThat(preview.error()).isZero();
        assertThat(preview.rows()).extracting("price").containsExactlyInAnyOrder(12_000L, null);
        assertThat(List.of(preview.rows().get(0).category(), preview.rows().get(1).category())).containsExactlyInAnyOrder("Nhóm", "Khác");
    }
}
