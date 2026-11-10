package vn.dnahoangnguyen.api.admin.user;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;
import vn.dnahoangnguyen.api.admin.audit.AuditService;
import vn.dnahoangnguyen.api.support.IntegrationTest;

/** Runs the bootstrap against the real database inside a transaction that is rolled back, so other tests are unaffected. */
class BootstrapManagerIT extends IntegrationTest {

    private static final String PASSWORD = "a long bootstrap pass";

    @Autowired
    AppUserRepository users;
    @Autowired
    PasswordEncoder encoder;
    @Autowired
    AuditService audit;
    @Autowired
    TransactionTemplate tx;
    @Autowired
    JdbcTemplate jdbc;

    @Test
    void createsOneManagerOnAnEmptyTableAndNeverASecond() {
        tx.executeWithoutResult(status -> {
            jdbc.update("delete from audit_log where actor_id is not null");
            jdbc.update("delete from app_user");
            BootstrapManagerRunner runner =
                    new BootstrapManagerRunner(users, encoder, audit, "Boot-Owner", PASSWORD, "Quản lý", "boot-owner@example.com");

            runner.run(new DefaultApplicationArguments());
            runner.run(new DefaultApplicationArguments());

            assertThat(users.count()).isEqualTo(1);
            AppUser manager = users.findByUsername("boot-owner").orElseThrow();
            assertThat(manager.getRole()).isEqualTo(Role.MANAGER);
            assertThat(manager.isEnabled()).isTrue();
            assertThat(manager.getEmail()).isEqualTo("boot-owner@example.com");
            assertThat(manager.getPasswordHash()).startsWith("{bcrypt}");
            assertThat(encoder.matches(PASSWORD, manager.getPasswordHash())).isTrue();

            Map<String, Object> auditRow = jdbc.queryForMap("""
                    select actor_id, actor_name, after::text as after
                    from audit_log where action = 'USER_BOOTSTRAP'
                    """);
            assertThat(auditRow.get("actor_id")).isNull();
            assertThat(auditRow.get("actor_name")).isEqualTo("BOOTSTRAP");
            assertThat((String) auditRow.get("after")).contains("Boot-Owner").doesNotContain(PASSWORD);

            status.setRollbackOnly();
        });
    }
}
