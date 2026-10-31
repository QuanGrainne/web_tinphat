package vn.dnahoangnguyen.api.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.dnahoangnguyen.api.admin.auth.LoginAttemptService;
import vn.dnahoangnguyen.api.common.error.ProblemCode;
import vn.dnahoangnguyen.api.common.error.Problems;
import vn.dnahoangnguyen.api.common.ratelimit.ClientIpResolver;
import vn.dnahoangnguyen.api.common.ratelimit.FixedWindowRateLimiter;

/**
 * Runs before the form-login filter. Caps login attempts per IP (429) and rejects attempts that arrive inside the
 * progressive delay of their (username, IP) pair with the same body as a wrong password, without checking the password.
 */
public class LoginThrottleFilter extends OncePerRequestFilter {

    public static final String LOGIN_PATH = "/api/auth/login";
    static final int MAX_ATTEMPTS_PER_IP = 20;
    static final Duration IP_WINDOW = Duration.ofMinutes(10);

    private final FixedWindowRateLimiter limiter;
    private final LoginAttemptService attempts;
    private final ClientIpResolver ips;
    private final JsonAuthHandlers handlers;

    public LoginThrottleFilter(FixedWindowRateLimiter limiter, LoginAttemptService attempts, ClientIpResolver ips,
                               JsonAuthHandlers handlers) {
        this.limiter = limiter;
        this.attempts = attempts;
        this.ips = ips;
        this.handlers = handlers;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !("POST".equals(request.getMethod()) && LOGIN_PATH.equals(request.getRequestURI()));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String ipKey = ips.ipKey(request);
        String ipLimitKey = "login:ip:" + ipKey;
        if (!limiter.tryAcquire(ipLimitKey, MAX_ATTEMPTS_PER_IP, IP_WINDOW)) {
            long retryAfter = Math.max(1, limiter.remaining(ipLimitKey).toSeconds());
            response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfter));
            handlers.writeProblem(response, request, HttpStatus.TOO_MANY_REQUESTS, ProblemCode.RATE_LIMITED,
                    Problems.DETAIL_RATE_LIMITED);
            return;
        }
        if (!attempts.remainingDelay(LoginAttemptService.key(request.getParameter("username"), ipKey)).isZero()) {
            handlers.writeLoginFailure(request, response);
            return;
        }
        chain.doFilter(request, response);
    }
}
