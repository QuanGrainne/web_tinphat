package vn.dnahoangnguyen.api.admin.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import tools.jackson.databind.json.JsonMapper;
import vn.dnahoangnguyen.api.admin.user.AppUserDetails;
import vn.dnahoangnguyen.api.admin.user.Role;

class AuditServiceTest {

    private final AuditLogRepository repository = mock(AuditLogRepository.class);
    private final AuditService service = new AuditService(repository, JsonMapper.builder().build());

    record Snapshot(String name, long price, boolean visible) {
    }

    @BeforeEach
    void signIn() {
        AppUserDetails user = new AppUserDetails(7, "owner", "Chủ cửa hàng", Role.MANAGER, null, true);
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities()));
    }

    @AfterEach
    void signOut() {
        SecurityContextHolder.clearContext();
    }

    private AuditLog saved() {
        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(repository).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void storesOnlyChangedFieldsAndCurrentActor() {
        service.record("PRICE_CHANGE", "SKU", 12L,
                new Snapshot("Giấy", 31000, true), new Snapshot("Giấy", 32000, true));

        AuditLog row = saved();
        assertThat(row.getActorId()).isEqualTo(7L);
        assertThat(row.getActorName()).isEqualTo("owner");
        assertThat(row.getAction()).isEqualTo("PRICE_CHANGE");
        assertThat(row.getEntityType()).isEqualTo("SKU");
        assertThat(row.getEntityId()).isEqualTo(12L);
        assertThat(row.getBeforeJson()).isEqualTo("{\"price\":31000}");
        assertThat(row.getAfterJson()).isEqualTo("{\"price\":32000}");
    }

    @Test
    void keepsAddedAndRemovedKeysInTheirSnapshot() {
        service.record("UPDATE", "SKU", 1L, Map.of("a", 1), Map.of("b", 2));

        AuditLog row = saved();
        assertThat(row.getBeforeJson()).isEqualTo("{\"a\":1}");
        assertThat(row.getAfterJson()).isEqualTo("{\"b\":2}");
    }

    @Test
    void storesWholeSnapshotWhenOneSideIsMissing() {
        service.record("DELETE", "PRODUCT", 3L, new Snapshot("Giấy", 1, false), null);

        AuditLog row = saved();
        assertThat(row.getBeforeJson()).isEqualTo("{\"name\":\"Giấy\",\"price\":1,\"visible\":false}");
        assertThat(row.getAfterJson()).isNull();
    }

    @Test
    void systemActorHasNoUserId() {
        service.recordAs(AuditActor.system("BANK_WEBHOOK"), "ORDER_PAID", "ORDER", 9L, null,
                Map.of("status", "PAID"));

        AuditLog row = saved();
        assertThat(row.getActorId()).isNull();
        assertThat(row.getActorName()).isEqualTo("BANK_WEBHOOK");
        assertThat(row.getAfterJson()).isEqualTo("{\"status\":\"PAID\"}");
    }

    @Test
    void recordWithoutAuthenticatedUserFailsFast() {
        SecurityContextHolder.clearContext();
        assertThatThrownBy(() -> service.record("X", "Y", 1L, null, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("recordAs");
    }
}
