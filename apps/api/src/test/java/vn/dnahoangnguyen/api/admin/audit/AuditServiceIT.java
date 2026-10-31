package vn.dnahoangnguyen.api.admin.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.support.TransactionTemplate;
import vn.dnahoangnguyen.api.support.IntegrationTest;

class AuditServiceIT extends IntegrationTest {

    @Autowired
    AuditService audit;
    @Autowired
    TransactionTemplate tx;
    @Autowired
    JdbcTemplate jdbc;

    @Test
    void recordOutsideATransactionIsRefused() {
        assertThatThrownBy(() -> audit.recordAs(AuditActor.system("TEST"), "NOOP", "THING", 1L, null, null))
                .isInstanceOf(IllegalTransactionStateException.class);
    }

    @Test
    void systemActorRowStoresOnlyTheDiffAndNoUserId() {
        long entityId = 987_001L;
        tx.executeWithoutResult(status -> audit.recordAs(AuditActor.system("BANK_WEBHOOK"), "ORDER_PAID", "ORDER",
                entityId, Map.of("status", "CONFIRMED", "total", 100), Map.of("status", "PAID", "total", 100)));

        List<Map<String, Object>> rows = jdbc.queryForList("""
                select actor_id, actor_name, action, before::text as before, after::text as after
                from audit_log where entity_type = 'ORDER' and entity_id = ?
                """, entityId);
        assertThat(rows).hasSize(1);
        Map<String, Object> row = rows.get(0);
        assertThat(row.get("actor_id")).isNull();
        assertThat(row.get("actor_name")).isEqualTo("BANK_WEBHOOK");
        assertThat(row.get("action")).isEqualTo("ORDER_PAID");
        assertThat((String) row.get("before")).contains("CONFIRMED").doesNotContain("total");
        assertThat((String) row.get("after")).contains("PAID").doesNotContain("total");
    }

    @Test
    void rolledBackChangeLeavesNoAuditRow() {
        long entityId = 987_002L;
        assertThatThrownBy(() -> tx.executeWithoutResult(status -> {
            audit.recordAs(AuditActor.system("TEST"), "WILL_ROLL_BACK", "THING", entityId, null, Map.of("a", 1));
            throw new IllegalStateException("fail after audit");
        })).isInstanceOf(IllegalStateException.class);

        Integer count = jdbc.queryForObject(
                "select count(*) from audit_log where entity_type = 'THING' and entity_id = ?", Integer.class, entityId);
        assertThat(count).isZero();
    }
}
