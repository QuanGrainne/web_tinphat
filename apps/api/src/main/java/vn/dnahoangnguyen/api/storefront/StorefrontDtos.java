package vn.dnahoangnguyen.api.storefront;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import vn.dnahoangnguyen.api.catalog.pricing.Saving;

/** Public catalogue shapes. Component names are the JSON property names of the API contract. */
public final class StorefrontDtos {

    private StorefrontDtos() {
    }

    public record NameSlug(String name, String slug) {
    }

    public record Crumb(String name, String href) {
    }

    public record PublicSku(
            long id,
            String code,
            String unitName,
            int conversion,
            @JsonProperty("isBase") boolean isBase,
            boolean priceVisible,
            Long price,
            Long effectivePrice,
            boolean promoActive,
            Long promoPrice,
            String promoTo,
            Long perBaseUnit,
            Saving saving) {
    }

    public record UnitChip(String name, boolean priceVisible) {
    }

    public record ProductCard(
            long id,
            String slug,
            String name,
            NameSlug brand,
            String imageUrl,
            String specLine,
            Long fromPrice,
            String fromUnitName,
            boolean hasMultipleUnits,
            List<UnitChip> units) {
    }

    public record PublicProduct(
            long id,
            String slug,
            String name,
            String status,
            NameSlug brand,
            NameSlug category,
            List<Crumb> breadcrumb,
            String imageUrl,
            String specLine,
            String descriptionMd,
            String baseCode,
            List<PublicSku> skus,
            List<ProductCard> related,
            String seoTitle,
            String seoDescription) {
    }

    public record NavChild(long id, String name, String slug, long productCount) {
    }

    public record NavCategory(long id, String name, String slug, long productCount, List<NavChild> children) {
    }

    public record BrandCount(String name, String slug, long productCount) {
    }

    public record Nav(List<NavCategory> categories, List<BrandCount> brands) {
    }

    public record CategoryCount(String name, String slug, long productCount) {
    }

    public record HomeSection(NameSlug category, List<ProductCard> products) {
    }

    public record HomeData(List<CategoryCount> categories, List<BrandCount> brands, List<HomeSection> sections) {
    }

    public record CategoryInfo(long id, String name, String slug, String description, NameSlug parent) {
    }

    public record FacetCount(String name, String slug, long count) {
    }

    public record BrandFacets(List<FacetCount> brands) {
    }

    public record CategoryFacets(List<FacetCount> categories) {
    }

    public record CategoryListing(List<ProductCard> items, int page, int pageSize, long total, CategoryInfo category,
                                  List<Crumb> breadcrumb, List<CategoryCount> children, BrandFacets facets) {
    }

    public record BrandInfo(String name, String slug, String description) {
    }

    public record BrandListing(List<ProductCard> items, int page, int pageSize, long total, BrandInfo brand,
                               List<Crumb> breadcrumb, CategoryFacets facets) {
    }

    public record SearchResult(List<ProductCard> items, int page, int pageSize, long total, String q) {
    }

    public record SuggestItem(String name, String slug, String code) {
    }

    public record Suggest(List<SuggestItem> items) {
    }

    public record SitemapProduct(String slug, String updatedAt) {
    }

    public record SitemapSlug(String slug) {
    }

    public record SitemapData(List<SitemapProduct> products, List<SitemapSlug> categories, List<SitemapSlug> brands) {
    }
}
