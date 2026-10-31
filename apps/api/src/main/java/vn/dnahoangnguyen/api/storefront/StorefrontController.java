package vn.dnahoangnguyen.api.storefront;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.BrandListing;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.CategoryListing;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.HomeData;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.Nav;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.PublicProduct;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.SearchResult;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.SitemapData;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.Suggest;

/** Anonymous read-only catalogue API. Every price in these responses has passed {@link PublicPriceRedactor}. */
@RestController
@RequestMapping("/api/public")
public class StorefrontController {

    private final StorefrontQueryService queries;
    private final SearchService search;

    public StorefrontController(StorefrontQueryService queries, SearchService search) {
        this.queries = queries;
        this.search = search;
    }

    @GetMapping("/nav")
    public Nav nav() {
        return queries.nav();
    }

    @GetMapping("/home")
    public HomeData home() {
        return queries.home();
    }

    @GetMapping("/categories/{slug}")
    public CategoryListing category(@PathVariable("slug") String slug,
                                    @RequestParam(name = "brand", required = false) List<String> brand,
                                    @RequestParam(name = "sort", defaultValue = "name_asc") String sort,
                                    @RequestParam(name = "page", defaultValue = "1") int page) {
        return queries.category(slug, brand, sort, page);
    }

    @GetMapping("/brands/{slug}")
    public BrandListing brand(@PathVariable("slug") String slug,
                              @RequestParam(name = "category", required = false) String category,
                              @RequestParam(name = "sort", defaultValue = "name_asc") String sort,
                              @RequestParam(name = "page", defaultValue = "1") int page) {
        return queries.brand(slug, category, sort, page);
    }

    @GetMapping("/products/{slug}")
    public PublicProduct product(@PathVariable("slug") String slug) {
        return queries.product(slug);
    }

    @GetMapping("/search")
    public SearchResult search(@RequestParam(name = "q", defaultValue = "") String q,
                               @RequestParam(name = "page", defaultValue = "1") int page) {
        return search.search(q, page);
    }

    @GetMapping("/search/suggest")
    public Suggest suggest(@RequestParam(name = "q", defaultValue = "") String q) {
        return search.suggest(q);
    }

    @GetMapping("/sitemap")
    public SitemapData sitemap() {
        return queries.sitemap();
    }
}
