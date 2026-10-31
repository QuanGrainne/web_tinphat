package vn.dnahoangnguyen.api.admin.user;

import java.io.Serial;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Session principal. The password hash is only needed while authenticating; Spring Security erases it
 * afterwards so it never lingers in the HTTP session.
 */
public final class AppUserDetails implements UserDetails, CredentialsContainer {

    @Serial
    private static final long serialVersionUID = 1L;

    private final long id;
    private final String username;
    private final String displayName;
    private final Role role;
    private final boolean enabled;
    private String passwordHash;

    public AppUserDetails(long id, String username, String displayName, Role role, String passwordHash,
                          boolean enabled) {
        this.id = id;
        this.username = username;
        this.displayName = displayName;
        this.role = role;
        this.passwordHash = passwordHash;
        this.enabled = enabled;
    }

    public static AppUserDetails from(AppUser user) {
        return new AppUserDetails(user.getId(), user.getUsername(), user.getDisplayName(), user.getRole(),
                user.getPasswordHash(), user.isEnabled());
    }

    public long id() {
        return id;
    }

    public String displayName() {
        return displayName;
    }

    public Role role() {
        return role;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(role.authority()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public void eraseCredentials() {
        this.passwordHash = null;
    }
}
