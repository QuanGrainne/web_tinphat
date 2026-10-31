package vn.dnahoangnguyen.api.catalog;

import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import vn.dnahoangnguyen.api.admin.audit.AuditActor;
import vn.dnahoangnguyen.api.admin.user.AppUser;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;
import vn.dnahoangnguyen.api.admin.user.Role;
import vn.dnahoangnguyen.api.catalog.brand.BrandService;
import vn.dnahoangnguyen.api.catalog.category.CategoryService;
import vn.dnahoangnguyen.api.catalog.product.ChangeActor;
import vn.dnahoangnguyen.api.catalog.product.ChangeSource;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminProduct;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminSku;
import vn.dnahoangnguyen.api.catalog.product.ProductService;
import vn.dnahoangnguyen.api.support.IntegrationTest;
import vn.dnahoangnguyen.api.support.TestAuth;

/** Shared fixtures for catalogue integration tests: an empty catalogue before every test and quick builders. */
@AutoConfigureMockMvc
public abstract class CatalogIntegrationTest extends IntegrationTest {

    protected static final ChangeActor MANAGER = new ChangeActor(AuditActor.system("test-manager"), true);
    protected static final ChangeActor EDITOR = new ChangeActor(AuditActor.system("test-editor"), false);

    @Autowired
    protected MockMvc mvc;
    @Autowired
    protected JdbcTemplate jdbc;
    @Autowired
    protected ProductService productService;
    @Autowired
    protected CategoryService categoryService;
    @Autowired
    protected BrandService brandService;
    @Autowired
    protected AppUserRepository users;
    @Autowired
    protected PasswordEncoder encoder;

    @BeforeEach
    void emptyCatalogue() {
        jdbc.execute("truncate table price_history, sku, product, brand, category restart identity cascade");
        // ids restart at 1, so audit rows of earlier tests would otherwise match the same entity ids
        jdbc.update("delete from audit_log where entity_type in ('PRODUCT', 'SKU')");
    }

    protected AppUser newUser(Role role) {
        return TestAuth.createUser(users, encoder, role.name().toLowerCase() + "-" + UUID.randomUUID(), "secret-pass", role);
    }

    protected static AdminSku sku(String code, String unit, int conversion, boolean base, Long price) {
        return new AdminSku(null, null, code, null, unit, conversion, base, price, true, false, null, null, null, true,
                null, null, null);
    }

    protected static AdminSku sku(String code, String unit, int conversion, boolean base, Long price,
                                  boolean priceVisible) {
        return new AdminSku(null, null, code, null, unit, conversion, base, price, priceVisible, false, null, null, null,
                true, null, null, null);
    }

    protected static AdminProduct product(String name, Long brandId, Long categoryId, AdminSku... skus) {
        return new AdminProduct(null, null, name, null, brandId, categoryId, null, null, null, null, null, null, null,
                null, java.util.List.of(skus), null, null);
    }

    /** Creates a product through the single write path and returns its id. */
    protected long create(String name, Long brandId, Long categoryId, AdminSku... skus) {
        return productService.saveAggregate(null, product(name, brandId, categoryId, skus), MANAGER, ChangeSource.MANUAL);
    }

    protected long count(String sql) {
        Long value = jdbc.queryForObject(sql, Long.class);
        return value == null ? 0 : value;
    }
}
