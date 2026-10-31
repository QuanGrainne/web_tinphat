package vn.dnahoangnguyen.api.admin.audit;

import vn.dnahoangnguyen.api.common.security.CurrentUser;

/** Who an audit row is attributed to. System actors have no {@code app_user} row ({@code id} is null). */
public record AuditActor(Long id, String name) {

    public static AuditActor system(String name) {
        return new AuditActor(null, name);
    }

    public static AuditActor user(CurrentUser user) {
        return new AuditActor(user.id(), user.username());
    }
}
