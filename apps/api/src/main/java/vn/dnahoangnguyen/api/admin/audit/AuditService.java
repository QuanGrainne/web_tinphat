package vn.dnahoangnguyen.api.admin.audit;

import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import vn.dnahoangnguyen.api.common.security.CurrentUser;

/**
 * Writes audit rows inside the caller's transaction (MANDATORY) so an audit row never exists without the change
 * it describes. When both snapshots are JSON objects only the keys that differ are stored.
 */
@Service
public class AuditService {

    private final AuditLogRepository repository;
    private final ObjectMapper mapper;

    public AuditService(AuditLogRepository repository, ObjectMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    /** Records an action by the current authenticated user. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(String action, String entityType, Long entityId, Object before, Object after) {
        CurrentUser user = CurrentUser.current()
                .orElseThrow(() -> new IllegalStateException(
                        "No authenticated user for audit action " + action + "; use recordAs with a system actor"));
        write(AuditActor.user(user), action, entityType, entityId, before, after);
    }

    /** Records an action attributed to an explicit actor (system jobs, webhooks, seed). */
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordAs(AuditActor actor, String action, String entityType, Long entityId, Object before,
                         Object after) {
        write(actor, action, entityType, entityId, before, after);
    }

    private void write(AuditActor actor, String action, String entityType, Long entityId, Object before,
                       Object after) {
        JsonNode beforeNode = before == null ? null : mapper.valueToTree(before);
        JsonNode afterNode = after == null ? null : mapper.valueToTree(after);
        if (beforeNode != null && afterNode != null && beforeNode.isObject() && afterNode.isObject()) {
            ObjectNode beforeDiff = mapper.createObjectNode();
            ObjectNode afterDiff = mapper.createObjectNode();
            Set<String> keys = new LinkedHashSet<>(beforeNode.propertyNames());
            keys.addAll(afterNode.propertyNames());
            for (String key : keys) {
                JsonNode b = beforeNode.get(key);
                JsonNode a = afterNode.get(key);
                if (!Objects.equals(b, a)) {
                    if (b != null) {
                        beforeDiff.set(key, b);
                    }
                    if (a != null) {
                        afterDiff.set(key, a);
                    }
                }
            }
            beforeNode = beforeDiff;
            afterNode = afterDiff;
        }
        repository.save(new AuditLog(actor.id(), actor.name(), action, entityType, entityId,
                beforeNode == null ? null : mapper.writeValueAsString(beforeNode),
                afterNode == null ? null : mapper.writeValueAsString(afterNode)));
    }
}
