package vn.dnahoangnguyen.api.storefront;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.dnahoangnguyen.api.catalog.CatalogTime;
import vn.dnahoangnguyen.api.catalog.brand.Brand;
import vn.dnahoangnguyen.api.catalog.category.Category;
import vn.dnahoangnguyen.api.catalog.product.Product;
import vn.dnahoangnguyen.api.catalog.product.ProductRepository;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.storefront.CatalogReader.Catalog;
import vn.dnahoangnguyen.api.storefront.CatalogReader.ProductView;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.BrandCount;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.BrandFacets;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.BrandInfo;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.BrandListing;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.CategoryCount;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.CategoryFacets;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.CategoryInfo;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.CategoryListing;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.Crumb;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.FacetCount;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.HomeData;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.HomeSection;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.Nav;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.NavCategory;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.NavChild;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.NameSlug;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.ProductCard;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.PublicProduct;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.SitemapData;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.SitemapProduct;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.SitemapSlug;

/** Read-only public catalogue: navigation, home, listings and the product page. */
@Service
public class StorefrontQueryService {

    public static final int PAGE_SIZE = 24;
    private static final int HOME_SECTION_SIZE = 5;
    private static final int RELATED_SIZE = 5;

    private final CatalogReader reader;
    private final ProductRepository products;

    StorefrontQueryService(CatalogReader reader, ProductRepository products) {
        this.reader = reader;
        this.products = products;
    }

    @Transactional(readOnly = true)
    public Nav nav() {
        Catalog catalog = reader.load();
        List<NavCategory> categories = new ArrayList<>();
        for (Category root : catalog.categories()) {
            if (root.getParentId() != null) {
                continue;
            }
            long total = catalog.productsIn(root).size();
            if (total == 0) {
                continue;
            }
            List<NavChild> children = catalog.childrenOf(root).stream()
                    .map(c -> new NavChild(c.getId(), c.getName(), c.getSlug(), catalog.productsIn(c).size()))
                    .filter(c -> c.productCount() > 0)
                    .toList();
            categories.add(new NavCategory(root.getId(), root.getName(), root.getSlug(), total, children));
        }
        return new Nav(categories, brandCounts(catalog));
    }

    @Transactional(readOnly = true)
    public HomeData home() {
        Catalog catalog = reader.load();
        List<CategoryCount> categories = new ArrayList<>();
        List<HomeSection> sections = new ArrayList<>();
        for (Category root : catalog.categories()) {
            if (root.getParentId() != null) {
                continue;
            }
            List<ProductView> inRoot = catalog.productsIn(root);
            if (inRoot.isEmpty()) {
                continue;
            }
            categories.add(new CategoryCount(root.getName(), root.getSlug(), inRoot.size()));
            List<ProductCard> cards = inRoot.stream().sorted(comparator("name_asc")).limit(HOME_SECTION_SIZE)
                    .map(ProductView::card).toList();
            sections.add(new HomeSection(new NameSlug(root.getName(), root.getSlug()), cards));
        }
        return new HomeData(categories, brandCounts(catalog), sections);
    }

    @Transactional(readOnly = true)
    public CategoryListing category(String slug, List<String> brandSlugs, String sort, int page) {
        Catalog catalog = reader.load();
        Category category = catalog.categoryBySlug(slug)
                .orElseThrow(() -> DomainException.notFound("Không tìm thấy nhóm hàng."));
        List<ProductView> inCategory = catalog.productsIn(category);

        Map<Long, Long> brandCounts = inCategory.stream().filter(v -> v.brand() != null)
                .collect(Collectors.groupingBy(v -> v.brand().getId(), Collectors.counting()));
        List<FacetCount> brandFacets = catalog.brands().stream()
                .filter(b -> brandCounts.containsKey(b.getId()))
                .map(b -> new FacetCount(b.getName(), b.getSlug(), brandCounts.get(b.getId())))
                .toList();

        Set<String> wanted = brandSlugs == null ? Set.of() : Set.copyOf(brandSlugs);
        List<ProductView> filtered = wanted.isEmpty() ? inCategory
                : inCategory.stream().filter(v -> v.brand() != null && wanted.contains(v.brand().getSlug())).toList();

        Category parent = category.getParentId() == null ? null : catalog.categoryById().get(category.getParentId());
        List<Crumb> breadcrumb = new ArrayList<>();
        if (parent != null) {
            breadcrumb.add(categoryCrumb(parent));
        }
        breadcrumb.add(categoryCrumb(category));
        List<CategoryCount> children = catalog.childrenOf(category).stream()
                .map(c -> new CategoryCount(c.getName(), c.getSlug(), catalog.productsIn(c).size()))
                .toList();

        Paged paged = page(filtered, sort, page);
        return new CategoryListing(paged.items(), paged.page(), PAGE_SIZE, filtered.size(),
                new CategoryInfo(category.getId(), category.getName(), category.getSlug(), category.getDescription(),
                        parent == null ? null : new NameSlug(parent.getName(), parent.getSlug())),
                breadcrumb, children, new BrandFacets(brandFacets));
    }

    @Transactional(readOnly = true)
    public BrandListing brand(String slug, String categorySlug, String sort, int page) {
        Catalog catalog = reader.load();
        Brand brand = catalog.brandBySlug(slug).orElseThrow(() -> DomainException.notFound("Không tìm thấy thương hiệu."));
        List<ProductView> ofBrand = catalog.views().stream()
                .filter(v -> v.brand() != null && v.brand().getId().equals(brand.getId())).toList();

        Map<Long, Long> categoryCounts = ofBrand.stream()
                .collect(Collectors.groupingBy(v -> v.category().getId(), Collectors.counting()));
        List<FacetCount> categoryFacets = catalog.categories().stream()
                .filter(c -> categoryCounts.containsKey(c.getId()))
                .map(c -> new FacetCount(c.getName(), c.getSlug(), categoryCounts.get(c.getId())))
                .toList();

        List<ProductView> filtered = ofBrand;
        if (categorySlug != null && !categorySlug.isBlank()) {
            Category wanted = catalog.categoryBySlug(categorySlug).orElse(null);
            Set<Long> inWanted = wanted == null ? Set.of() : catalog.productsIn(wanted).stream()
                    .map(v -> v.product().getId()).collect(Collectors.toSet());
            filtered = ofBrand.stream().filter(v -> inWanted.contains(v.product().getId())).toList();
        }
        Paged paged = page(filtered, sort, page);
        return new BrandListing(paged.items(), paged.page(), PAGE_SIZE, filtered.size(),
                new BrandInfo(brand.getName(), brand.getSlug(), brand.getDescription()),
                List.of(new Crumb(brand.getName(), "/thuong-hieu/" + brand.getSlug())),
                new CategoryFacets(categoryFacets));
    }

    @Transactional(readOnly = true)
    public PublicProduct product(String slug) {
        Product product = products.findBySlug(slug).filter(Product::isPublished)
                .orElseThrow(() -> DomainException.notFound("Không tìm thấy sản phẩm."));
        Catalog catalog = reader.load();
        ProductView view = reader.viewOf(catalog, product)
                .orElseThrow(() -> DomainException.notFound("Không tìm thấy sản phẩm."));

        Category category = view.category();
        List<Crumb> breadcrumb = new ArrayList<>();
        if (category != null) {
            Category parent = category.getParentId() == null ? null : catalog.categoryById().get(category.getParentId());
            if (parent != null) {
                breadcrumb.add(categoryCrumb(parent));
            }
            breadcrumb.add(categoryCrumb(category));
        }
        breadcrumb.add(new Crumb(product.getName(), "/san-pham/" + product.getSlug()));

        List<ProductCard> related = category == null ? List.of() : catalog.views().stream()
                .filter(v -> v.category() != null && v.category().getId().equals(category.getId()))
                .filter(v -> !v.product().getId().equals(product.getId()))
                .sorted(comparator("name_asc"))
                .limit(RELATED_SIZE)
                .map(ProductView::card)
                .toList();

        String baseCode = view.skus().stream().filter(s -> s.isBase()).map(s -> s.code()).findFirst()
                .orElse(view.skus().get(0).code());
        return new PublicProduct(product.getId(), product.getSlug(), product.getName(), product.getStatus().name(),
                StorefrontMapper.nameSlug(view.brand()), category == null ? null : new NameSlug(category.getName(), category.getSlug()),
                breadcrumb, product.getImageUrl(), product.getSpecLine(), product.getDescriptionMd(), baseCode,
                view.skus(), related, product.getSeoTitle(), product.getSeoDescription());
    }

    @Transactional(readOnly = true)
    public SitemapData sitemap() {
        Catalog catalog = reader.load();
        List<SitemapProduct> productRows = catalog.views().stream()
                .sorted(Comparator.comparing((ProductView v) -> v.product().getSlug()))
                .map(v -> new SitemapProduct(v.product().getSlug(), CatalogTime.iso(v.product().getUpdatedAt())))
                .toList();
        List<SitemapSlug> categories = catalog.categories().stream()
                .filter(c -> !catalog.productsIn(c).isEmpty()).map(c -> new SitemapSlug(c.getSlug())).toList();
        List<SitemapSlug> brands = brandCounts(catalog).stream().map(b -> new SitemapSlug(b.slug())).toList();
        return new SitemapData(productRows, categories, brands);
    }

    // ---- shared helpers ----

    private static List<BrandCount> brandCounts(Catalog catalog) {
        Map<Long, Long> counts = catalog.views().stream().filter(v -> v.brand() != null)
                .collect(Collectors.groupingBy(v -> v.brand().getId(), Collectors.counting()));
        return catalog.brands().stream()
                .filter(b -> counts.containsKey(b.getId()))
                .map(b -> new BrandCount(b.getName(), b.getSlug(), counts.get(b.getId())))
                .toList();
    }

    private static Crumb categoryCrumb(Category category) {
        return new Crumb(category.getName(), "/danh-muc/" + category.getSlug());
    }

    record Paged(List<ProductCard> items, int page) {
    }

    static Paged page(List<ProductView> views, String sort, int requestedPage) {
        int page = Math.max(1, requestedPage);
        List<ProductView> sorted = views.stream().sorted(comparator(sort)).toList();
        int from = (int) Math.min((long) (page - 1) * PAGE_SIZE, sorted.size());
        int to = Math.min(from + PAGE_SIZE, sorted.size());
        return new Paged(sorted.subList(from, to).stream().map(ProductView::card).toList(), page);
    }

    /** name_asc (default), name_desc, price_asc, price_desc; products without a public price always sort last. */
    static Comparator<ProductView> comparator(String sort) {
        Comparator<ProductView> byName = Comparator.comparing(ProductView::foldedName)
                .thenComparing((ProductView v) -> v.product().getName())
                .thenComparing((ProductView v) -> v.product().getId());
        String key = sort == null ? "" : sort;
        return switch (key) {
            case "name_desc" -> byName.reversed();
            case "price_asc" -> Comparator.comparing((ProductView v) -> v.card().fromPrice(),
                    Comparator.nullsLast(Comparator.<Long>naturalOrder())).thenComparing(byName);
            case "price_desc" -> Comparator.comparing((ProductView v) -> v.card().fromPrice(),
                    Comparator.nullsLast(Comparator.<Long>reverseOrder())).thenComparing(byName);
            default -> byName;
        };
    }

}
