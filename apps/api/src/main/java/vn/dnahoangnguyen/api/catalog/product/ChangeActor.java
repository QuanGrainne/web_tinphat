package vn.dnahoangnguyen.api.catalog.product;

import vn.dnahoangnguyen.api.admin.audit.AuditActor;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.security.CurrentUser;

/** Who performs a catalogue write: the audit identity plus whether restricted fields may be changed. */
public record ChangeActor(AuditActor audit, boolean manager) {

    public static ChangeActor of(CurrentUser user) {
        return new ChangeActor(AuditActor.user(user), user.isManager());
    }

    /** The signed-in admin user of the current request. */
    public static ChangeActor current() {
        return of(CurrentUser.current()
                .orElseThrow(() -> new IllegalStateException("Admin endpoint reached without an authenticated user")));
    }

    /** Manager-only fields: a person who is not a manager gets 403 FORBIDDEN_FIELD naming {@code field}. */
    public void requireManager(String field, String detailVi) {
        if (!manager) {
            throw DomainException.forbiddenField(field, detailVi);
        }
    }

    /** The seed loader: no user row, unrestricted. */
    public static ChangeActor seed() {
        return new ChangeActor(AuditActor.system("SEED"), true);
    }
}
