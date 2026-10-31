package vn.dnahoangnguyen.api.catalog.seed;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import vn.dnahoangnguyen.api.catalog.seed.CatalogueSeedCsv.SeedRow;
import vn.dnahoangnguyen.api.catalog.sku.SkuCodeKey;

class CatalogueSeedCsvTest {

    private static List<SeedRow> rows;

    @BeforeAll
    static void load() throws IOException {
        try (InputStream in = new ClassPathResource("seed/catalogue-2026.csv").getInputStream()) {
            rows = CatalogueSeedCsv.parse(in);
        }
    }

    private static SeedRow byCode(String code) {
        return rows.stream().filter(r -> r.code().equals(code)).findFirst().orElseThrow();
    }

    @Test
    void has69SkusAcross32Products() {
        assertThat(rows).hasSize(69);
        assertThat(rows.stream().map(SeedRow::productKey).collect(Collectors.toSet())).hasSize(32);
    }

    @Test
    void everyProductHasExactlyOneBaseRowWithConversionOne() {
        Map<String, List<SeedRow>> byProduct = rows.stream().collect(Collectors.groupingBy(SeedRow::productKey));
        byProduct.forEach((key, group) -> {
            List<SeedRow> bases = group.stream().filter(SeedRow::isBase).toList();
            assertThat(bases).as("base rows of %s", key).hasSize(1);
            assertThat(bases.get(0).conversion()).as("base conversion of %s", key).isEqualTo(1);
        });
    }

    @Test
    void conversionsArePositiveAndCodeKeysAreDistinct() {
        assertThat(rows).allSatisfy(r -> assertThat(r.conversion()).isPositive());
        Set<String> keys = rows.stream().map(r -> SkuCodeKey.of(r.code())).collect(Collectors.toSet());
        assertThat(keys).hasSize(69);
    }

    @Test
    void emptyOptionalColumnsAreNull() {
        assertThat(rows).allSatisfy(r -> assertThat(r.categoryL2()).isNull());
        assertThat(byCode("SVRĐ1280t").spec()).isNull();
        assertThat(byCode("SV465-4L- Gói").spec()).isEqualTo("465 tờ • 4 lớp");
    }

    @Test
    void quotedFieldsKeepTheirCommas() {
        SeedRow row = byCode("R03P- 3 AAA - UM4 - 1.5V - Vỉ");
        assertThat(row.productName()).isEqualTo("R03P- 3 AAA - UM4 - 1.5V nhãn vàng vỉ, hộp nhãn đen");
        assertThat(row.spec()).isEqualTo("R03P • AAA • 1,5V");
    }

    @Test
    void codesAreKeptVerbatim() {
        assertThat(rows.stream().map(SeedRow::code))
                .contains("SV465-4L- Gói", "SVRĐ1280t 6G", "SV12C1.4Kg 4L(SV1412) G", "SV-KUCV100T-CV ( KUCV24)");
    }

    @Test
    void onlyTheTwoUnconfirmedPackingRowsAreHiddenAndFlagged() {
        List<String> flagged = rows.stream()
                .filter(r -> !r.priceVisible() && r.needsConfirmation())
                .map(SeedRow::code)
                .toList();
        assertThat(flagged).containsExactlyInAnyOrder("SV465-4L- T80", "SV465-4L- G8");
        assertThat(rows.stream().filter(r -> !r.priceVisible() || r.needsConfirmation())).hasSize(2);

        SeedRow napkin = byCode("SV300-3L-Gói");
        assertThat(napkin.price()).isEqualTo(3_229);
        assertThat(napkin.priceVisible()).isTrue();
        assertThat(napkin.needsConfirmation()).isFalse();
        SeedRow napkinPack = byCode("SP000014");
        assertThat(napkinPack.price()).isEqualTo(32_290);
        assertThat(napkinPack.priceVisible()).isTrue();
        assertThat(napkinPack.needsConfirmation()).isFalse();
    }

    @Test
    void priceTotalMatchesTheHandCheckedSum() {
        assertThat(rows.stream().mapToLong(SeedRow::price).sum()).isEqualTo(23_600_440L);
    }
}
