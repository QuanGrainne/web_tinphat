package vn.dnahoangnguyen.api.catalog.product;

import vn.dnahoangnguyen.api.admin.audit.AuditActor;
import vn.dnahoangnguyen.api.common.security.CurrentUser;

/** Who performs a catalogue write: the audit identity plus whether restricted fields may be changed. */
public record ChangeActor(AuditActor audit, boolean manager) {

    public static ChangeActor of(CurrentUser user) {
        return new ChangeActor(AuditActor.user(user), user.isManager());
    }

    /** The seed loader: no user row, unrestricted. */
    public static ChangeActor seed() {
        return new ChangeActor(AuditActor.system("SEED"), true);
    }
}
