package vn.dnahoangnguyen.api.support;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.dnahoangnguyen.api.settings.SettingsService;

/** Boots the whole application: Flyway applies every migration and Hibernate validates the mappings against them. */
class FlywayMigrationIT extends IntegrationTest {

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    SettingsService settings;

    @Test
    void allMigrationsApplyAndSchemaIsPresent() {
        Integer tables = jdbc.queryForObject("""
                select count(*) from information_schema.tables
                where table_schema = 'public'
                  and table_name in ('app_user', 'audit_log', 'app_setting', 'category', 'brand', 'product', 'sku', 'price_history')
                """, Integer.class);
        assertThat(tables).isEqualTo(8);
    }

    @Test
    void oneBaseSkuPerProductIsEnforced() {
        Integer partialUniqueIndex = jdbc.queryForObject("""
                select count(*) from pg_indexes
                where tablename = 'sku' and indexname = 'ux_sku_one_base'
                """, Integer.class);
        assertThat(partialUniqueIndex).isEqualTo(1);
    }

    @Test
    void seededSettingsAreReadable() {
        assertThat(settings.company().taxCode()).isEmpty();
        assertThat(settings.company().name()).isEqualTo("CÔNG TY TNHH SẢN XUẤT TÍN PHÁT");
        assertThat(settings.mismatchThresholdPct()).isEqualTo(2.0);
        assertThat(settings.discountTiers()).isEmpty();
        assertThat(settings.trustStrip()).containsExactly("Sản xuất & Phân phối", "Hotline 0914 794 472");
        assertThat(settings.hotline()).isEqualTo("0914 794 472");
        assertThat(settings.zalo()).contains("0914794472");
    }
}
