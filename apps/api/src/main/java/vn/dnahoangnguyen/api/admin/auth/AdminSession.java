package vn.dnahoangnguyen.api.admin.auth;

import vn.dnahoangnguyen.api.admin.user.Role;
import vn.dnahoangnguyen.api.common.security.CurrentUser;

/** Response of login and {@code GET /api/admin/me}. */
public record AdminSession(String username, String displayName, Role role) {

    public static AdminSession of(CurrentUser user) {
        return new AdminSession(user.username(), user.displayName(), user.role());
    }
}
