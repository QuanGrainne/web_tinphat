package vn.dnahoangnguyen.api.admin.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {

    /**
     * Clients call this before their first mutation. The {@code XSRF-TOKEN} cookie itself is written by the CSRF
     * filter of the admin security chain on every response; the client echoes it in {@code X-XSRF-TOKEN}.
     */
    @GetMapping("/api/auth/csrf")
    public ResponseEntity<Void> csrf() {
        return ResponseEntity.noContent().build();
    }
}
