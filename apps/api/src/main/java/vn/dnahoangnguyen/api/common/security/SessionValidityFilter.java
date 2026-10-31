package vn.dnahoangnguyen.api.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.authentication.session.SessionAuthenticationException;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.dnahoangnguyen.api.admin.user.AppUser;
import vn.dnahoangnguyen.api.admin.user.AppUserDetails;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;

/**
 * Re-checks the signed-in user on every {@code /api/admin/**} request (one primary-key read). The session ends with
 * 401 when the user was disabled or removed, the role changed, the password changed after login, or the login is older
 * than {@link #ABSOLUTE_LIFETIME}. Changes made directly in the database therefore take effect on the next request.
 */
public class SessionValidityFilter extends OncePerRequestFilter {

    /** Session attribute holding the {@link Instant} of the login (or of the last own password change). */
    public static final String AUTH_TIME_ATTR = "dna.authTime";
    public static final Duration ABSOLUTE_LIFETIME = Duration.ofHours(12);

    private final AppUserRepository users;
    private final Clock clock;
    private final AuthenticationEntryPoint entryPoint;

    public SessionValidityFilter(AppUserRepository users, Clock clock, AuthenticationEntryPoint entryPoint) {
        this.users = users;
        this.clock = clock;
        this.entryPoint = entryPoint;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/admin/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AppUserDetails principal
                && !stillValid(request, principal)) {
            HttpSession session = request.getSession(false);
            if (session != null) {
                session.invalidate();
            }
            SecurityContextHolder.clearContext();
            entryPoint.commence(request, response, new SessionAuthenticationException("Session is no longer valid"));
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean stillValid(HttpServletRequest request, AppUserDetails principal) {
        AppUser user = users.findById(principal.id()).orElse(null);
        if (user == null || !user.isEnabled() || user.getRole() != principal.role()) {
            return false;
        }
        HttpSession session = request.getSession(false);
        Object authTime = session == null ? null : session.getAttribute(AUTH_TIME_ATTR);
        if (authTime instanceof Instant loggedInAt) {
            return !user.getPasswordChangedAt().isAfter(loggedInAt)
                    && !clock.instant().isAfter(loggedInAt.plus(ABSOLUTE_LIFETIME));
        }
        return true;
    }
}
