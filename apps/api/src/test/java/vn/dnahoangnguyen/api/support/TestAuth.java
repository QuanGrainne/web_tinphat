package vn.dnahoangnguyen.api.support;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import vn.dnahoangnguyen.api.admin.user.AppUser;
import vn.dnahoangnguyen.api.admin.user.AppUserDetails;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;
import vn.dnahoangnguyen.api.admin.user.Role;
import vn.dnahoangnguyen.api.common.security.SessionValidityFilter;

/**
 * Helpers for MockMvc tests that act as an admin user. The user must exist in the database because audit rows
 * reference it and every admin request re-reads it. Admin POST/PUT/DELETE also need
 * {@code .with(SecurityMockMvcRequestPostProcessors.csrf())}.
 */
public final class TestAuth {

    private TestAuth() {
    }

    public static AppUser createUser(AppUserRepository users, PasswordEncoder encoder, String username,
                                     String rawPassword, Role role) {
        return users.save(new AppUser(username, encoder.encode(rawPassword), "Test " + username, role));
    }

    /** Request post-processor that signs the request in as {@code user}, with a fresh login time in the session. */
    public static RequestPostProcessor as(AppUser user) {
        AppUserDetails principal = AppUserDetails.from(user);
        RequestPostProcessor auth = authentication(UsernamePasswordAuthenticationToken.authenticated(principal, null,
                principal.getAuthorities()));
        return request -> {
            MockHttpSession session = new MockHttpSession();
            session.setAttribute(SessionValidityFilter.AUTH_TIME_ATTR, Instant.now());
            request.setSession(session);
            return auth.postProcessRequest(request);
        };
    }

    /** Double-submit CSRF pair for requests that do not go through a login. */
    public static RequestPostProcessor xsrf(String token) {
        return request -> {
            request.setCookies(new Cookie("XSRF-TOKEN", token));
            request.addHeader("X-XSRF-TOKEN", token);
            return request;
        };
    }

    /** Sets the trusted client-IP header the rate limiters read. */
    public static RequestPostProcessor clientIp(String ip) {
        return request -> {
            request.addHeader("CF-Connecting-IP", ip);
            return request;
        };
    }
}
