package vn.dnahoangnguyen.api.catalog.seed;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.dnahoangnguyen.api.catalog.brand.BrandService;
import vn.dnahoangnguyen.api.catalog.category.Category;
import vn.dnahoangnguyen.api.catalog.category.CategoryService;
import vn.dnahoangnguyen.api.catalog.product.ChangeActor;
import vn.dnahoangnguyen.api.catalog.product.ChangeSource;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminProduct;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminSku;
import vn.dnahoangnguyen.api.catalog.product.ProductService;
import vn.dnahoangnguyen.api.catalog.product.ProductStatus;
import vn.dnahoangnguyen.api.catalog.seed.CatalogueSeedCsv.SeedRow;
import vn.dnahoangnguyen.api.catalog.sku.Sku;
import vn.dnahoangnguyen.api.catalog.sku.SkuCodeKey;
import vn.dnahoangnguyen.api.catalog.sku.SkuRepository;

/**
 * Loads the printed catalogue (69 SKUs, 32 products) on start when {@code dna.seed.catalogue.enabled} is true.
 * Idempotent: SKUs whose code key already exists are skipped, so a second run writes nothing.
 * {@code dna.seed.catalogue.publish} publishes the products it creates.
 */
@Component
public class CatalogueSeedLoader implements ApplicationRunner {

    public record Summary(int productsCreated, int skusCreated, int productsSkipped) {
    }

    private static final Logger log = LoggerFactory.getLogger(CatalogueSeedLoader.class);
    private static final String RESOURCE = "seed/catalogue-2026.csv";

    private final boolean enabled;
    private final boolean publish;
    private final ProductService productService;
    private final CategoryService categoryService;
    private final BrandService brandService;
    private final SkuRepository skus;
    private final TransactionTemplate tx;

    public CatalogueSeedLoader(@Value("${dna.seed.catalogue.enabled:false}") boolean enabled,
                               @Value("${dna.seed.catalogue.publish:false}") boolean publish,
                               ProductService productService, CategoryService categoryService,
                               BrandService brandService, SkuRepository skus, PlatformTransactionManager txManager) {
        this.enabled = enabled;
        this.publish = publish;
        this.productService = productService;
        this.categoryService = categoryService;
        this.brandService = brandService;
        this.skus = skus;
        this.tx = new TransactionTemplate(txManager);
    }

    @Override
    public void run(ApplicationArguments args) {
        if (enabled) {
            load();
        }
    }

    /** Runs the seed in one transaction; a failure leaves the catalogue untouched. */
    public Summary load() {
        Summary summary = tx.execute(status -> doLoad());
        log.info("Catalogue seed: {} products and {} SKUs created, {} products already present (publish={})",
                summary.productsCreated(), summary.skusCreated(), summary.productsSkipped(), publish);
        return summary;
    }

    private Summary doLoad() {
        List<SeedRow> rows = readRows();
        Set<String> existing = new HashSet<>();
        for (Sku sku : skus.findByCodeKeyIn(rows.stream().map(r -> SkuCodeKey.of(r.code())).toList())) {
            existing.add(sku.getCodeKey());
        }
        Map<String, List<SeedRow>> byProduct = new LinkedHashMap<>();
        rows.forEach(r -> byProduct.computeIfAbsent(r.productKey(), k -> new ArrayList<>()).add(r));

        int created = 0;
        int createdSkus = 0;
        int skipped = 0;
        for (List<SeedRow> group : byProduct.values()) {
            List<SeedRow> fresh = group.stream().filter(r -> !existing.contains(SkuCodeKey.of(r.code()))).toList();
            if (fresh.isEmpty()) {
                skipped++;
                continue;
            }
            if (fresh.stream().noneMatch(SeedRow::isBase)) {
                log.warn("Seed product '{}' skipped: its base SKU code already exists", group.get(0).productKey());
                skipped++;
                continue;
            }
            long id = productService.saveAggregate(null, toProduct(group.get(0), fresh), ChangeActor.seed(),
                    ChangeSource.SEED);
            if (publish) {
                productService.publish(id, ChangeActor.seed());
            }
            created++;
            createdSkus += fresh.size();
        }
        return new Summary(created, createdSkus, skipped);
    }

    private AdminProduct toProduct(SeedRow first, List<SeedRow> fresh) {
        Long brandId = brandService.findOrCreate(first.brand()).getId();
        Category level1 = categoryService.findOrCreate(first.categoryL1(), null);
        Long categoryId = first.categoryL2() == null
                ? level1.getId()
                : categoryService.findOrCreate(first.categoryL2(), level1.getId()).getId();
        List<AdminSku> skuRows = fresh.stream().map(CatalogueSeedLoader::toSku).toList();
        return new AdminProduct(null, null, first.productName(), null, brandId, categoryId, null, first.spec(), null,
                null, null, null, false, ProductStatus.ACTIVE, skuRows, null, null);
    }

    private static AdminSku toSku(SeedRow r) {
        return new AdminSku(null, null, r.code(), r.skuName(), r.unitName(), r.conversion(), r.isBase(), r.price(),
                r.priceVisible(), r.needsConfirmation(), null, null, null, true, null, null, null);
    }

    private static List<SeedRow> readRows() {
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            return CatalogueSeedCsv.parse(in);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read " + RESOURCE, e);
        }
    }
}
