package vn.dnahoangnguyen.api.catalog.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.dnahoangnguyen.api.catalog.CatalogIntegrationTest;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminProduct;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminSku;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;

class ProductServiceIT extends CatalogIntegrationTest {

    @Autowired
    ProductAdminService reader;
    @Autowired
    PlatformTransactionManager txManager;

    private long newCategory() {
        return categoryService.create(new vn.dnahoangnguyen.api.catalog.category.CategoryService.CategoryCreate("Giấy", null)).id();
    }

    private AdminProduct tissue() {
        return product("Giấy rút đáy Sen Vàng", null, null,
                sku("SVRĐ1280t", "Gói", 1, true, 21_000L),
                sku("SVRĐ1280t 6G", "Thùng 6G", 6, false, 126_000L));
    }

    /** The stored aggregate as an update request, with a modification applied to the first SKU and the product. */
    private AdminProduct edit(long id, java.util.function.UnaryOperator<AdminSku> skuChange) {
        AdminProduct stored = reader.get(id);
        List<AdminSku> skus = new ArrayList<>(stored.skus());
        skus.set(0, skuChange.apply(skus.get(0)));
        return new AdminProduct(stored.id(), stored.version(), stored.name(), stored.slug(), stored.brandId(),
                stored.categoryId(), stored.descriptionMd(), stored.specLine(), stored.imageUrl(), stored.seoTitle(),
                stored.seoDescription(), stored.internalNote(), stored.published(), stored.status(), skus, null, null);
    }

    private static AdminSku withPrice(AdminSku s, Long price) {
        return new AdminSku(s.id(), s.version(), s.code(), s.name(), s.unitName(), s.conversion(), s.isBase(), price,
                s.priceVisible(), s.needsConfirmation(), s.promoPrice(), s.promoFrom(), s.promoTo(), s.visible(),
                s.source(), null, null);
    }

    private static AdminSku withFlag(AdminSku s, boolean needsConfirmation) {
        return new AdminSku(s.id(), s.version(), s.code(), s.name(), s.unitName(), s.conversion(), s.isBase(), s.price(),
                s.priceVisible(), needsConfirmation, s.promoPrice(), s.promoFrom(), s.promoTo(), s.visible(), s.source(),
                null, null);
    }

    private static void assertDomain(Throwable t, HttpStatus status, ProblemCode code) {
        assertThat(t).isInstanceOfSatisfying(DomainException.class, e -> {
            assertThat(e.status()).isEqualTo(status);
            assertThat(e.code()).isEqualTo(code);
        });
    }

    @Test
    void createWritesProductSkusHistoryAndAudit() {
        long id = productService.saveAggregate(null, tissue(), MANAGER, ChangeSource.MANUAL);

        AdminProduct stored = reader.get(id);
        assertThat(stored.slug()).isEqualTo("giay-rut-day-sen-vang");
        assertThat(stored.published()).isFalse();
        assertThat(stored.skus()).extracting(AdminSku::code).containsExactly("SVRĐ1280t", "SVRĐ1280t 6G");
        assertThat(stored.skus().get(1).perBaseUnit()).isEqualTo(21_000L);
        assertThat(count("select count(*) from price_history where source = 'MANUAL' and field = 'PRICE'")).isEqualTo(2);
        assertThat(count("select count(*) from audit_log where action = 'PRODUCT_CREATE' and entity_id = " + id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select search_text from product where id = ?", String.class, id))
                .contains("giay rut day sen vang").contains("svrd1280t 6g");
    }

    @Test
    void priceChangeWritesHistoryAndAuditAndRollsBackTogether() {
        long id = productService.saveAggregate(null, tissue(), MANAGER, ChangeSource.MANUAL);
        long history = count("select count(*) from price_history");
        long audits = count("select count(*) from audit_log where action = 'PRICE_CHANGE'");

        productService.saveAggregate(id, edit(id, s -> withPrice(s, 22_000L)), MANAGER, ChangeSource.MANUAL);

        assertThat(count("select count(*) from price_history")).isEqualTo(history + 1);
        assertThat(count("select count(*) from audit_log where action = 'PRICE_CHANGE'")).isEqualTo(audits + 1);
        AdminProduct after = reader.get(id);
        assertThat(after.priceHistory().get(0).oldPrice()).isEqualTo(21_000L);
        assertThat(after.priceHistory().get(0).newPrice()).isEqualTo(22_000L);
        assertThat(after.priceHistory().get(0).changedBy()).isEqualTo("test-manager");

        long historyBefore = count("select count(*) from price_history");
        long auditsBefore = count("select count(*) from audit_log where action = 'PRICE_CHANGE'");
        AdminProduct again = edit(id, s -> withPrice(s, 23_000L));
        assertThatThrownBy(() -> new TransactionTemplate(txManager).executeWithoutResult(status -> {
            productService.saveAggregate(id, again, MANAGER, ChangeSource.MANUAL);
            throw new IllegalStateException("force rollback");
        })).hasMessage("force rollback");
        assertThat(count("select count(*) from price_history")).isEqualTo(historyBefore);
        assertThat(count("select count(*) from audit_log where action = 'PRICE_CHANGE'")).isEqualTo(auditsBefore);
    }

    @Test
    void editorMayEditTextButNotPrices() {
        long id = productService.saveAggregate(null, tissue(), MANAGER, ChangeSource.MANUAL);

        AdminProduct stored = reader.get(id);
        AdminProduct textOnly = new AdminProduct(stored.id(), stored.version(), stored.name(), stored.slug(), null, null,
                "Mô tả mới", "6 cuộn", null, null, null, null, null, null, stored.skus(), null, null);
        productService.saveAggregate(id, textOnly, EDITOR, ChangeSource.MANUAL);
        assertThat(reader.get(id).specLine()).isEqualTo("6 cuộn");

        assertThatThrownBy(() -> productService.saveAggregate(id, edit(id, s -> withPrice(s, 99_000L)), EDITOR,
                ChangeSource.MANUAL)).satisfies(e -> assertDomain(e, HttpStatus.FORBIDDEN, ProblemCode.FORBIDDEN_FIELD));
        assertThatThrownBy(() -> productService.saveAggregate(id, edit(id, s -> withFlag(s, true)), EDITOR,
                ChangeSource.MANUAL)).satisfies(e -> assertDomain(e, HttpStatus.FORBIDDEN, ProblemCode.FORBIDDEN_FIELD));
        assertThat(reader.get(id).skus().get(0).price()).isEqualTo(21_000L);

        productService.saveAggregate(id, edit(id, s -> withFlag(s, true)), MANAGER, ChangeSource.MANUAL);
        assertThat(reader.get(id).skus().get(0).needsConfirmation()).isTrue();
        assertThat(count("select count(*) from audit_log where action = 'PRODUCT_UPDATE' and entity_id = " + id))
                .isGreaterThanOrEqualTo(1);
    }

    @Test
    void editorCannotCreateProducts() {
        assertThatThrownBy(() -> productService.saveAggregate(null, tissue(), EDITOR, ChangeSource.MANUAL))
                .satisfies(e -> assertDomain(e, HttpStatus.FORBIDDEN, ProblemCode.FORBIDDEN_FIELD));
    }

    @Test
    void staleVersionIsAConflict() {
        long id = productService.saveAggregate(null, tissue(), MANAGER, ChangeSource.MANUAL);
        AdminProduct stale = reader.get(id);
        productService.saveAggregate(id, edit(id, s -> withPrice(s, 22_000L)), MANAGER, ChangeSource.MANUAL);

        assertThatThrownBy(() -> productService.saveAggregate(id, stale, MANAGER, ChangeSource.MANUAL))
                .satisfies(e -> assertDomain(e, HttpStatus.CONFLICT, ProblemCode.VERSION_CONFLICT));
    }

    @Test
    void duplicateCodeKeyIsAConflict() {
        create("Sản phẩm A", null, null, sku("SV465-4L- Gói", "Gói", 1, true, 5_330L));

        // same code typed with a non-breaking space and lower case
        assertThatThrownBy(() -> create("Sản phẩm B", null, null, sku("sv465-4l- gói", "Gói", 1, true, 5_000L)))
                .satisfies(e -> assertDomain(e, HttpStatus.CONFLICT, ProblemCode.DUPLICATE));
        assertThat(count("select count(*) from product")).isEqualTo(1);
    }

    @Test
    void exactlyOneBaseSkuWithConversionOneIsRequired() {
        assertThatThrownBy(() -> create("Hai cơ sở", null, null, sku("A1", "Gói", 1, true, 1L), sku("A2", "Cây", 1, true, 2L)))
                .satisfies(e -> assertDomain(e, HttpStatus.BAD_REQUEST, ProblemCode.VALIDATION_FAILED));
        assertThatThrownBy(() -> create("Không cơ sở", null, null, sku("B1", "Gói", 1, false, 1L)))
                .satisfies(e -> assertDomain(e, HttpStatus.BAD_REQUEST, ProblemCode.VALIDATION_FAILED));
        assertThatThrownBy(() -> create("Cơ sở sai", null, null, sku("C1", "Thùng", 5, true, 1L)))
                .satisfies(e -> assertDomain(e, HttpStatus.BAD_REQUEST, ProblemCode.VALIDATION_FAILED));
    }

    @Test
    void absurdPricesAndConversionsAreRejected() {
        assertThatThrownBy(() -> create("Giá quá lớn", null, null, sku("BIG1", "Gói", 1, true, 2_000_000_000_000L)))
                .satisfies(e -> assertDomain(e, HttpStatus.BAD_REQUEST, ProblemCode.VALIDATION_FAILED));
        assertThatThrownBy(() -> create("Âm", null, null, sku("NEG1", "Gói", 1, true, -1L)))
                .satisfies(e -> assertDomain(e, HttpStatus.BAD_REQUEST, ProblemCode.VALIDATION_FAILED));
        assertThatThrownBy(() -> create("Quy đổi lớn", null, null, sku("CV1", "Gói", 1, true, 1L),
                sku("CV2", "Thùng", 2_000_000, false, 1L)))
                .satisfies(e -> assertDomain(e, HttpStatus.BAD_REQUEST, ProblemCode.VALIDATION_FAILED));
        assertThat(count("select count(*) from product")).isZero();
    }

    @Test
    void skusMissingFromAnUpdateAreHiddenNeverDeleted() {
        long id = productService.saveAggregate(null, tissue(), MANAGER, ChangeSource.MANUAL);
        AdminProduct stored = reader.get(id);
        AdminProduct withoutBox = new AdminProduct(stored.id(), stored.version(), stored.name(), stored.slug(), null, null,
                null, null, null, null, null, null, null, null, List.of(stored.skus().get(0)), null, null);

        productService.saveAggregate(id, withoutBox, MANAGER, ChangeSource.MANUAL);

        assertThat(count("select count(*) from sku")).isEqualTo(2);
        assertThat(count("select count(*) from sku where visible = false")).isEqualTo(1);
        // adding the same code again revives the hidden SKU instead of failing on the unique key
        AdminProduct reAdded = new AdminProduct(id, reader.get(id).version(), stored.name(), stored.slug(), null, null,
                null, null, null, null, null, null, null, null,
                List.of(reader.get(id).skus().get(0), sku("SVRĐ1280t 6G", "Thùng 6G", 6, false, 125_000L)), null, null);
        productService.saveAggregate(id, reAdded, MANAGER, ChangeSource.MANUAL);
        assertThat(count("select count(*) from sku")).isEqualTo(2);
        assertThat(count("select count(*) from sku where visible = false")).isZero();
    }

    @Test
    void baseCanMoveToAnotherSku() {
        long id = productService.saveAggregate(null, tissue(), MANAGER, ChangeSource.MANUAL);
        AdminProduct stored = reader.get(id);
        AdminSku oldBase = stored.skus().get(0);
        AdminSku box = stored.skus().get(1);
        // the pack becomes the base unit (conversion 1), the old base becomes a 6-pack
        AdminSku newBase = new AdminSku(box.id(), box.version(), box.code(), box.name(), box.unitName(), 1, true,
                box.price(), true, false, null, null, null, true, null, null, null);
        AdminSku demoted = new AdminSku(oldBase.id(), oldBase.version(), oldBase.code(), oldBase.name(), "Lốc", 6, false,
                oldBase.price(), true, false, null, null, null, true, null, null, null);
        AdminProduct swapped = new AdminProduct(stored.id(), stored.version(), stored.name(), stored.slug(), null, null,
                null, null, null, null, null, null, null, null, List.of(newBase, demoted), null, null);

        productService.saveAggregate(id, swapped, MANAGER, ChangeSource.MANUAL);

        assertThat(count("select count(*) from sku where is_base and code = 'SVRĐ1280t 6G'")).isEqualTo(1);
        assertThat(count("select count(*) from sku where is_base")).isEqualTo(1);
    }

    @Test
    void publishNeedsACategoryAndAPricedVisibleSku() {
        long noCategory = create("Chưa có nhóm", null, null, sku("P1", "Gói", 1, true, 1_000L));
        assertThatThrownBy(() -> productService.publish(noCategory, MANAGER)).satisfies(t -> {
            assertDomain(t, HttpStatus.UNPROCESSABLE_ENTITY, ProblemCode.PUBLISH_REQUIREMENTS_UNMET);
            assertThat(((DomainException) t).extensions().get("missing")).isEqualTo(List.of("CATEGORY"));
        });

        long noPrice = create("Chưa có giá", null, newCategory(), sku("P2", "Gói", 1, true, null));
        assertThatThrownBy(() -> productService.publish(noPrice, MANAGER))
                .satisfies(t -> assertDomain(t, HttpStatus.UNPROCESSABLE_ENTITY, ProblemCode.PUBLISH_REQUIREMENTS_UNMET));
    }

    @Test
    void publishWithoutImageIsAllowedAndKeepsTheNeedsAttentionFlag() {
        long id = create("Không ảnh", null, newCategory(), sku("P3", "Gói", 1, true, 1_000L));

        productService.publish(id, MANAGER);

        AdminProduct stored = reader.get(id);
        assertThat(stored.published()).isTrue();
        assertThat(stored.warnings()).extracting(ProductDtos.ProductWarning::type).contains("NO_IMAGE");
        assertThat(count("select count(*) from audit_log where action = 'PUBLISH' and entity_id = " + id)).isEqualTo(1);
        assertThat(reader.list(null, null, null, null, true, 1, 30).total()).isEqualTo(1);

        productService.discontinue(id, MANAGER);
        assertThat(reader.get(id).status()).isEqualTo(ProductStatus.DISCONTINUED);
        productService.reactivate(id, MANAGER);
        productService.unpublish(id, MANAGER);
        assertThat(reader.get(id).published()).isFalse();
    }

    @Test
    void packPriceMismatchWarningUsesTheConfiguredThreshold() {
        long id = create("SV465", null, null, sku("SV465-4L- Gói", "Gói", 1, true, 5_330L),
                sku("SV465-4L- T80", "Thùng", 80, false, 440_000L));

        AdminSku box = reader.get(id).skus().get(1);
        assertThat(box.warnings()).hasSize(1);
        assertThat(box.warnings().get(0).type()).isEqualTo("PRICE_MISMATCH");
        assertThat(box.warnings().get(0).deviationPct()).isEqualTo(3.2);
        assertThat(box.warnings().get(0).message()).contains("+3,2%").contains("426.400đ");
        assertThat(reader.get(id).skus().get(0).warnings()).isEmpty();
    }

    @Test
    void sameNameGetsANumberedSlug() {
        long first = create("Giấy ăn", null, null, sku("A1", "Gói", 1, true, 1L));
        long second = create("Giấy ăn", null, null, sku("A2", "Gói", 1, true, 1L));

        assertThat(reader.get(first).slug()).isEqualTo("giay-an");
        assertThat(reader.get(second).slug()).isEqualTo("giay-an-2");
    }

    @Test
    void adminListFiltersPagesAndTotals() {
        var brand = brandService.create(new vn.dnahoangnguyen.api.catalog.brand.BrandService.BrandCreate("GP"));
        var parent = categoryService.create(new vn.dnahoangnguyen.api.catalog.category.CategoryService.CategoryCreate("Pin", null));
        var child = categoryService.create(
                new vn.dnahoangnguyen.api.catalog.category.CategoryService.CategoryCreate("Pin kiềm", parent.id()));
        long pin = create("Pin GP kiềm", brand.id(), child.id(), sku("GPK1", "Vỉ", 1, true, 20_000L),
                sku("GPK1-H", "Hộp", 10, false, 200_000L));
        create("Giấy ăn", null, null, sku("GA1", "Gói", 1, true, 5_000L));
        productService.publish(pin, MANAGER);

        assertThat(reader.list("pin kiem", null, null, null, null, 1, 30).total()).isEqualTo(1);
        // a code of a non-base unit finds the product too
        assertThat(reader.list("gpk1-h", null, null, null, null, 1, 30).items()).extracting("name")
                .containsExactly("Pin GP kiềm");
        assertThat(reader.list(null, parent.id(), null, null, null, 1, 30).total()).isEqualTo(1);
        assertThat(reader.list(null, null, brand.id(), null, null, 1, 30).total()).isEqualTo(1);
        assertThat(reader.list(null, null, null, true, null, 1, 30).total()).isEqualTo(1);
        assertThat(reader.list(null, null, null, false, null, 1, 30).total()).isEqualTo(1);

        var all = reader.list(null, null, null, null, null, 1, 30);
        assertThat(all.totals().products()).isEqualTo(2);
        assertThat(all.totals().skus()).isEqualTo(3);
        assertThat(all.totals().visibleSkus()).isEqualTo(3);
        assertThat(all.items()).extracting("baseCode").containsExactlyInAnyOrder("GPK1", "GA1");
        var firstPage = reader.list(null, null, null, null, null, 1, 1);
        assertThat(firstPage.items()).hasSize(1);
        assertThat(firstPage.total()).isEqualTo(2);
    }

    @Test
    void brandRenameRefreshesSearchText() {
        var brand = brandService.create(new vn.dnahoangnguyen.api.catalog.brand.BrandService.BrandCreate("Sen Vang"));
        long id = create("Giấy ăn", brand.id(), null, sku("G1", "Gói", 1, true, 1_000L));
        assertThat(jdbc.queryForObject("select search_text from product where id = ?", String.class, id)).contains("sen vang");

        brandService.update(brand.id(), new vn.dnahoangnguyen.api.catalog.brand.BrandService.BrandUpdate("Sen Vàng Mới", null),
                MANAGER);

        assertThat(jdbc.queryForObject("select search_text from product where id = ?", String.class, id))
                .contains("sen vang moi");
    }
}
