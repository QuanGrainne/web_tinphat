package vn.dnahoangnguyen.api.storefront;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.dnahoangnguyen.api.catalog.sku.SkuCodeKey;
import vn.dnahoangnguyen.api.catalog.text.TextFold;
import vn.dnahoangnguyen.api.storefront.CatalogReader.Catalog;
import vn.dnahoangnguyen.api.storefront.CatalogReader.ProductView;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.ProductCard;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.PublicSku;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.SearchResult;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.Suggest;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.SuggestItem;

/**
 * Diacritic-insensitive search: every token of the query must occur in the product's folded {@code search_text}.
 * A query that is exactly a SKU code puts that product first. Matching is plain substring search in memory, so
 * {@code %} and {@code _} are ordinary characters.
 */
@Service
public class SearchService {

    static final int SUGGEST_MAX = 8;
    static final int SUGGEST_MIN_CHARS = 2;
    static final int MAX_QUERY_CHARS = 100;

    private final CatalogReader reader;

    SearchService(CatalogReader reader) {
        this.reader = reader;
    }

    @Transactional(readOnly = true)
    public SearchResult search(String q, int requestedPage) {
        String query = limit(q);
        List<ProductView> hits = rank(reader.load(), query);
        int page = Math.max(1, requestedPage);
        int from = (int) Math.min((long) (page - 1) * StorefrontQueryService.PAGE_SIZE, hits.size());
        int to = Math.min(from + StorefrontQueryService.PAGE_SIZE, hits.size());
        List<ProductCard> items = hits.subList(from, to).stream().map(ProductView::card).toList();
        return new SearchResult(items, page, StorefrontQueryService.PAGE_SIZE, hits.size(), query);
    }

    @Transactional(readOnly = true)
    public Suggest suggest(String q) {
        String query = limit(q);
        String folded = TextFold.fold(query);
        if (folded.length() < SUGGEST_MIN_CHARS) {
            return new Suggest(List.of());
        }
        List<SuggestItem> items = rank(reader.load(), query).stream()
                .limit(SUGGEST_MAX)
                .map(v -> new SuggestItem(v.product().getName(), v.product().getSlug(), matchedCode(v, folded)))
                .toList();
        return new Suggest(items);
    }

    private static String limit(String q) {
        String stripped = q == null ? "" : q.strip();
        return stripped.length() > MAX_QUERY_CHARS ? stripped.substring(0, MAX_QUERY_CHARS) : stripped;
    }

    /** Products matching all tokens, exact code hits first, then names starting with the query, then the rest. */
    private static List<ProductView> rank(Catalog catalog, String query) {
        String folded = TextFold.fold(query);
        if (folded.isEmpty()) {
            return List.of();
        }
        List<String> tokens = Arrays.asList(folded.split(" "));
        String codeKey = SkuCodeKey.of(query);
        return catalog.views().stream()
                .filter(v -> tokens.stream().allMatch(v.product().getSearchText()::contains))
                .sorted(Comparator.comparingInt((ProductView v) -> rankOf(v, codeKey, folded))
                        .thenComparing(ProductView::foldedName)
                        .thenComparing(v -> v.product().getId()))
                .toList();
    }

    private static int rankOf(ProductView view, String codeKey, String foldedQuery) {
        if (view.skus().stream().anyMatch(s -> SkuCodeKey.of(s.code()).equals(codeKey))) {
            return 0;
        }
        return view.foldedName().startsWith(foldedQuery) ? 1 : 2;
    }

    /** The SKU code the query hit, so the suggestion can show it; null when the match came from the name. */
    private static String matchedCode(ProductView view, String foldedQuery) {
        return view.skus().stream()
                .map(PublicSku::code)
                .filter(code -> TextFold.fold(code).contains(foldedQuery))
                .findFirst()
                .orElse(null);
    }
}
