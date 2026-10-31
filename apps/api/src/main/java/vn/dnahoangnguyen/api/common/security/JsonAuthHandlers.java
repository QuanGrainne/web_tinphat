package vn.dnahoangnguyen.api.common.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import vn.dnahoangnguyen.api.admin.user.AppUserDetails;
import vn.dnahoangnguyen.api.common.error.ProblemCode;
import vn.dnahoangnguyen.api.common.error.Problems;

/**
 * Security-layer responses as problem JSON, never redirects or HTML. Every login failure (wrong password,
 * unknown or disabled user, throttled) produces the same body so the response reveals nothing.
 */
@Component
public class JsonAuthHandlers {

    public static final String DETAIL_LOGIN_FAILED = "Tên đăng nhập hoặc mật khẩu không đúng.";
    public static final String DETAIL_CSRF = "Phiên làm việc không hợp lệ. Vui lòng tải lại trang và thử lại.";

    private final ObjectMapper mapper;

    public JsonAuthHandlers(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public AuthenticationEntryPoint entryPoint() {
        return (request, response, ex) -> writeProblem(response, request, HttpStatus.UNAUTHORIZED,
                ProblemCode.UNAUTHENTICATED, Problems.DETAIL_UNAUTHENTICATED);
    }

    public AccessDeniedHandler accessDenied() {
        return (request, response, ex) -> {
            boolean csrf = ex instanceof CsrfException;
            writeProblem(response, request, HttpStatus.FORBIDDEN, ProblemCode.FORBIDDEN,
                    csrf ? DETAIL_CSRF : Problems.DETAIL_FORBIDDEN);
        };
    }

    public AuthenticationSuccessHandler success() {
        return (HttpServletRequest request, HttpServletResponse response, Authentication authentication) -> {
            Map<String, Object> body = new LinkedHashMap<>();
            if (authentication.getPrincipal() instanceof AppUserDetails user) {
                body.put("username", user.getUsername());
                body.put("displayName", user.displayName());
                body.put("role", user.role().name());
            }
            write(response, HttpStatus.OK, "application/json", body);
        };
    }

    public AuthenticationFailureHandler failure() {
        return (request, response, ex) -> writeLoginFailure(request, response);
    }

    /** The single response for any failed login. */
    public void writeLoginFailure(HttpServletRequest request, HttpServletResponse response) throws IOException {
        writeProblem(response, request, HttpStatus.UNAUTHORIZED, ProblemCode.UNAUTHENTICATED, DETAIL_LOGIN_FAILED);
    }

    public void writeProblem(HttpServletResponse response, HttpServletRequest request, HttpStatus status,
                             ProblemCode code, String detailVi) throws IOException {
        write(response, status, "application/problem+json",
                Problems.body(status, code, detailVi, request.getRequestURI(), null, null));
    }

    private void write(HttpServletResponse response, HttpStatus status, String contentType, Object body)
            throws IOException {
        if (response.isCommitted()) {
            return;
        }
        response.setStatus(status.value());
        response.setContentType(contentType);
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-store");
        response.getOutputStream().write(mapper.writeValueAsBytes(body));
    }
}
