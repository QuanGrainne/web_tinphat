package vn.dnahoangnguyen.api.storefront;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import vn.dnahoangnguyen.api.catalog.brand.Brand;
import vn.dnahoangnguyen.api.catalog.brand.BrandRepository;
import vn.dnahoangnguyen.api.catalog.category.Category;
import vn.dnahoangnguyen.api.catalog.category.CategoryRepository;
import vn.dnahoangnguyen.api.catalog.pricing.PriceRules;
import vn.dnahoangnguyen.api.catalog.product.Product;
import vn.dnahoangnguyen.api.catalog.product.ProductRepository;
import vn.dnahoangnguyen.api.catalog.product.ProductStatus;
import vn.dnahoangnguyen.api.catalog.sku.Sku;
import vn.dnahoangnguyen.api.catalog.sku.SkuRepository;
import vn.dnahoangnguyen.api.catalog.text.TextFold;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.ProductCard;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.PublicSku;

/**
 * Loads the public view of the catalogue in a handful of queries. The catalogue is small (tens to low thousands of
 * products), so filtering, sorting and paging happen in memory over this snapshot.
 */
@Component
class CatalogReader {

    /** A listable product with everything the public API derives from it. */
    record ProductView(Product product, Brand brand, Category category, List<PublicSku> skus, ProductCard card,
                       String foldedName) {
    }

    /** Visible categories and brands plus every product that may appear in lists (published and active). */
    record Catalog(LocalDate today, List<Category> categories, Map<Long, Category> categoryById,
                   List<Brand> brands, Map<Long, Brand> brandById, List<ProductView> views) {

        Optional<Category> categoryBySlug(String slug) {
            return categories.stream().filter(c -> c.getSlug().equals(slug)).findFirst();
        }

        Optional<Brand> brandBySlug(String slug) {
            return brands.stream().filter(b -> b.getSlug().equals(slug)).findFirst();
        }

        List<Category> childrenOf(Category parent) {
            return categories.stream().filter(c -> parent.getId().equals(c.getParentId())).toList();
        }

        /** Products of a category; a level-1 category also holds the products of its children. */
        List<ProductView> productsIn(Category category) {
            return views.stream().filter(v -> v.category() != null && inTree(v.category(), category)).toList();
        }

        private static boolean inTree(Category productCategory, Category root) {
            return productCategory.getId().equals(root.getId()) || root.getId().equals(productCategory.getParentId());
        }
    }

    static final Comparator<Category> CATEGORY_ORDER =
            Comparator.comparingInt(Category::getSortOrder).thenComparing(Category::getName);
    static final Comparator<Brand> BRAND_ORDER =
            Comparator.comparingInt(Brand::getSortOrder).thenComparing(Brand::getName);

    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;
    private final SkuRepository skuRepository;
    private final Clock clock;

    CatalogReader(CategoryRepository categoryRepository, BrandRepository brandRepository,
                  ProductRepository productRepository, SkuRepository skuRepository, Clock clock) {
        this.categoryRepository = categoryRepository;
        this.brandRepository = brandRepository;
        this.productRepository = productRepository;
        this.skuRepository = skuRepository;
        this.clock = clock;
    }

    Catalog load() {
        LocalDate today = PriceRules.today(clock);
        List<Category> categories = categoryRepository.findAll().stream()
                .filter(Category::isVisible).sorted(CATEGORY_ORDER).toList();
        Map<Long, Category> categoryById = categories.stream().collect(Collectors.toMap(Category::getId, c -> c));
        List<Brand> brands = brandRepository.findAll().stream()
                .filter(Brand::isVisible).sorted(BRAND_ORDER).toList();
        Map<Long, Brand> brandById = brands.stream().collect(Collectors.toMap(Brand::getId, b -> b));

        List<Product> products = productRepository.findByPublishedTrueAndStatus(ProductStatus.ACTIVE).stream()
                .filter(p -> p.getCategoryId() != null && categoryById.containsKey(p.getCategoryId()))
                .toList();
        Map<Long, List<Sku>> skusByProduct = skuRepository
                .findByProductIdInAndVisibleTrue(products.stream().map(Product::getId).toList()).stream()
                .collect(Collectors.groupingBy(Sku::getProductId));

        List<ProductView> views = products.stream()
                .map(p -> view(p, skusByProduct.getOrDefault(p.getId(), List.of()), categoryById, brandById, today))
                .filter(v -> !v.skus().isEmpty())
                .toList();
        return new Catalog(today, categories, categoryById, brands, brandById, views);
    }

    /** View of one published product (including a discontinued one) for its own page. */
    Optional<ProductView> viewOf(Catalog catalog, Product product) {
        List<Sku> visible = skuRepository.findByProductIdInAndVisibleTrue(List.of(product.getId()));
        if (visible.isEmpty()) {
            return Optional.empty();
        }
        Map<Long, Category> categories = new HashMap<>(catalog.categoryById());
        if (product.getCategoryId() != null && !categories.containsKey(product.getCategoryId())) {
            categoryRepository.findById(product.getCategoryId()).ifPresent(c -> categories.put(c.getId(), c));
        }
        return Optional.of(view(product, visible, categories, catalog.brandById(), catalog.today()));
    }

    private static ProductView view(Product product, List<Sku> visibleSkus, Map<Long, Category> categories,
                                    Map<Long, Brand> brands, LocalDate today) {
        Brand brand = product.getBrandId() == null ? null : brands.get(product.getBrandId());
        Category category = product.getCategoryId() == null ? null : categories.get(product.getCategoryId());
        List<PublicSku> skus = StorefrontMapper.publicSkus(visibleSkus, today);
        return new ProductView(product, brand, category, skus, StorefrontMapper.card(product, brand, skus),
                TextFold.fold(product.getName()));
    }
}
