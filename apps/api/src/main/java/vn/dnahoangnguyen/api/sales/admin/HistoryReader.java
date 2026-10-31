package vn.dnahoangnguyen.api.sales.admin;

import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import vn.dnahoangnguyen.api.admin.audit.AuditLog;
import vn.dnahoangnguyen.api.admin.audit.AuditLogRepository;
import vn.dnahoangnguyen.api.common.config.AsyncSchedulingConfig;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.HistoryEntry;

/** Reads the "Lịch sử" tab from audit rows of one order or quote, oldest first. */
@Component
public class HistoryReader {

    private final AuditLogRepository audit;
    private final ObjectMapper mapper;

    public HistoryReader(AuditLogRepository audit, ObjectMapper mapper) {
        this.audit = audit;
        this.mapper = mapper;
    }

    public List<HistoryEntry> read(String entityType, long entityId) {
        List<AuditLog> rows = new ArrayList<>(audit.findByEntityTypeAndEntityIdOrderByAtDesc(entityType, entityId));
        java.util.Collections.reverse(rows);
        List<HistoryEntry> history = new ArrayList<>();
        for (AuditLog row : rows) {
            JsonNode before = parse(row.getBeforeJson());
            JsonNode after = parse(row.getAfterJson());
            history.add(new HistoryEntry(row.getAt().atZone(AsyncSchedulingConfig.BUSINESS_ZONE).toOffsetDateTime(),
                    row.getActorName(), row.getAction(), text(before, "status"), text(after, "status"),
                    text(after, "note")));
        }
        return history;
    }

    private JsonNode parse(String json) {
        if (json == null) {
            return null;
        }
        try {
            return mapper.readTree(json);
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static String text(JsonNode node, String field) {
        if (node == null || node.get(field) == null || node.get(field).isNull()) {
            return null;
        }
        return node.get(field).asText();
    }
}
