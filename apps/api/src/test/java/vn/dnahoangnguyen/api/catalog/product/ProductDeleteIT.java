package vn.dnahoangnguyen.api.catalog.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.dnahoangnguyen.api.catalog.CatalogIntegrationTest;
import vn.dnahoangnguyen.api.catalog.category.CategoryService.CategoryCreate;
import vn.dnahoangnguyen.api.catalog.excel.ProductExportService;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminProduct;
import vn.dnahoangnguyen.api.common.error.DomainException;

class ProductDeleteIT extends CatalogIntegrationTest {

    @Autowired
    ProductAdminService reader;
    @Autowired
    ProductExportService exports;

    private long group() {
        return categoryService.create(new CategoryCreate("Nhóm " + UUID.randomUUID(), null)).id();
    }

    @Test
    void deletingRemovesTheProductItsSkusPriceHistoryAndGallery() {
        long id = create("Sẽ xóa", null, group(), sku("X1", "cái", 1, true, 1_000L));
        AdminProduct s = reader.get(id);
        productService.saveAggregate(id, new AdminProduct(s.id(), s.version(), s.name(), s.slug(), s.brandId(), s.categoryId(), s.descriptionMd(),
                s.specLine(), "/a.jpg", s.seoTitle(), s.seoDescription(), s.internalNote(), s.published(), s.status(), s.skus(), null, null,
                List.of("/b.jpg")), MANAGER, ChangeSource.MANUAL);
        long other = create("Giữ lại", null, group(), sku("X2", "cái", 1, true, 2_000L));

        productService.delete(id, MANAGER);

        assertThat(count("select count(*) from product where id = " + id)).isZero();
        assertThat(count("select count(*) from sku where code = 'X1'")).isZero();
        assertThat(count("select count(*) from product_image")).isZero();
        assertThat(count("select count(*) from price_history")).isEqualTo(1);
        assertThat(count("select count(*) from audit_log where action = 'PRODUCT_DELETE' and entity_id = " + id)).isEqualTo(1);
        assertThat(reader.get(other).name()).isEqualTo("Giữ lại");
    }

    @Test
    void aProductUsedInAQuoteStaysAndAnEditorCannotDelete() {
        long id = create("Đã báo giá", null, group(), sku("Y1", "cái", 1, true, 1_000L));
        Long sku = jdbc.queryForObject("select id from sku where code = 'Y1'", Long.class);
        Long quote = jdbc.queryForObject("""
                insert into quote_request (code, submission_id, customer_name, phone, phone_norm)
                values ('BGTEST1', ?, 'Khách', '0900000000', '0900000000') returning id""", Long.class, UUID.randomUUID());
        jdbc.update("""
                insert into quote_item (quote_id, sku_id, sku_code, product_name, unit_name, conversion, qty)
                values (?, ?, 'Y1', 'Đã báo giá', 'cái', 1, 1)""", quote, sku);
        try {
            assertThatThrownBy(() -> productService.delete(id, MANAGER)).isInstanceOf(DomainException.class);
            assertThat(count("select count(*) from product where id = " + id)).isEqualTo(1);
            assertThat(count("select count(*) from price_history")).isEqualTo(1);
        } finally {
            jdbc.update("delete from quote_item where quote_id = ?", quote);
            jdbc.update("delete from quote_request where id = ?", quote);
        }
        assertThatThrownBy(() -> productService.delete(id, EDITOR)).isInstanceOf(DomainException.class);
        assertThat(count("select count(*) from product where id = " + id)).isEqualTo(1);
    }

    @Test
    void nextCodeFollowsTheHighestSpCodeAndIgnoresOtherCodes() {
        assertThat(productService.nextCode()).isEqualTo("SP000001");
        long group = group();
        create("A", null, group, sku("SP004640", "cái", 1, true, null));
        create("B", null, group, sku("SP000007", "cái", 1, true, null));
        create("C", null, group, sku("TP-ABC", "cái", 1, true, null));
        create("D", null, group, sku("SPX99", "cái", 1, true, null));
        assertThat(productService.nextCode()).isEqualTo("SP004641");
    }

    @Test
    void exportOfTickedProductsContainsOnlyThose() throws IOException {
        long group = group();
        long first = create("Chọn A", null, group, sku("Z1", "cái", 1, true, null));
        create("Không chọn", null, group, sku("Z2", "cái", 1, true, null));
        long third = create("Chọn B", null, group, sku("Z3", "cái", 1, true, null));

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(exports.export(null, List.of(first, third))))) {
            var sheet = workbook.getSheetAt(0);
            assertThat(sheet.getLastRowNum()).isEqualTo(2);
            assertThat(List.of(sheet.getRow(1).getCell(2).getStringCellValue(), sheet.getRow(2).getCell(2).getStringCellValue()))
                    .containsExactlyInAnyOrder("Z1", "Z3");
        }
    }
}
