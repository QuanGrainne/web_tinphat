package vn.dnahoangnguyen.api.catalog.seed;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.dnahoangnguyen.api.catalog.CatalogIntegrationTest;

class CatalogueSeedLoaderIT extends CatalogIntegrationTest {

    @Autowired
    CatalogueSeedLoader loader;

    @Test
    void loadsTheWholeCatalogueAsDraftsAndIsIdempotent() {
        var first = loader.load();

        assertThat(first.productsCreated()).isEqualTo(32);
        assertThat(first.skusCreated()).isEqualTo(69);
        assertThat(count("select count(*) from product")).isEqualTo(32);
        assertThat(count("select count(*) from sku")).isEqualTo(69);
        assertThat(count("select count(*) from product where published")).isZero();
        assertThat(count("select sum(price) from sku")).isEqualTo(23_600_440L);
        assertThat(count("select count(*) from price_history where source = 'SEED' and field = 'PRICE'")).isEqualTo(69);
        assertThat(count("select count(*) from sku where code = 'SV465-4L- Gói'")).isEqualTo(1);
        assertThat(count("select count(*) from category where parent_id is null")).isEqualTo(6);
        assertThat(count("select count(*) from brand")).isEqualTo(5);

        long history = count("select count(*) from price_history");
        var second = loader.load();

        assertThat(second.productsCreated()).isZero();
        assertThat(second.skusCreated()).isZero();
        assertThat(count("select count(*) from product")).isEqualTo(32);
        assertThat(count("select count(*) from sku")).isEqualTo(69);
        assertThat(count("select count(*) from price_history")).isEqualTo(history);
    }

    @Test
    void flagsOnlyTheTwoUnconfirmedPackingSkus() {
        loader.load();

        assertThat(count("select count(*) from sku where not price_visible and needs_confirmation")).isEqualTo(2);
        assertThat(count("select count(*) from sku where not price_visible or needs_confirmation")).isEqualTo(2);
        assertThat(count("select count(*) from sku where code in ('SV465-4L- T80', 'SV465-4L- G8') and not price_visible"))
                .isEqualTo(2);
        assertThat(count("select count(*) from sku where code in ('SV300-3L-Gói', 'SP000014') and price_visible "
                + "and not needs_confirmation")).isEqualTo(2);
    }

    @Test
    void anExistingCodeIsSkippedAndTheRestIsLoaded() {
        // the same code (typed differently) already belongs to a product the seed does not know
        create("Có sẵn", null, null, sku("sv6c  bathroom tissue", "Gói", 1, true, 1L));

        var summary = loader.load();

        // the pre-existing code is the base of seed product "sv6c": the rest of that product is not orphaned in
        assertThat(summary.productsCreated()).isEqualTo(31);
        assertThat(count("select count(*) from product")).isEqualTo(32);
        assertThat(count("select count(*) from sku where code = 'SP000019'")).isZero();
    }
}
