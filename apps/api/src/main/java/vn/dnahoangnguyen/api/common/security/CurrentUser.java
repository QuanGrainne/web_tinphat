package vn.dnahoangnguyen.api.common.security;

import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import vn.dnahoangnguyen.api.admin.user.AppUserDetails;
import vn.dnahoangnguyen.api.admin.user.Role;

/** The authenticated admin user of the current request, if any. */
public record CurrentUser(long id, String username, String displayName, Role role) {

    public static Optional<CurrentUser> current() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof AppUserDetails details) {
            return Optional.of(new CurrentUser(details.id(), details.getUsername(), details.displayName(),
                    details.role()));
        }
        return Optional.empty();
    }

    public boolean isManager() {
        return role == Role.MANAGER;
    }
}
