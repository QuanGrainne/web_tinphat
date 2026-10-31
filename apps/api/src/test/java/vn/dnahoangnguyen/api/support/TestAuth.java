package vn.dnahoangnguyen.api.support;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import vn.dnahoangnguyen.api.admin.user.AppUser;
import vn.dnahoangnguyen.api.admin.user.AppUserDetails;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;
import vn.dnahoangnguyen.api.admin.user.Role;

/**
 * Helpers for MockMvc tests that act as an admin user. The user must exist in the database because audit rows
 * reference it and every admin request re-reads it. Admin POST/PUT/DELETE also need
 * {@code .with(SecurityMockMvcRequestPostProcessors.csrf())}.
 */
public final class TestAuth {

    private TestAuth() {
    }

    public static AppUser createUser(AppUserRepository users, PasswordEncoder encoder, String username, String rawPassword,
                                     Role role) {
        return users.save(new AppUser(username, encoder.encode(rawPassword), "Test " + username, role));
    }

    /** Request post-processor that signs the request in as {@code user}. */
    public static RequestPostProcessor as(AppUser user) {
        AppUserDetails principal = AppUserDetails.from(user);
        return authentication(UsernamePasswordAuthenticationToken.authenticated(principal, null,
                principal.getAuthorities()));
    }
}
