package vn.dnahoangnguyen.api.support;

import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/** Mutating endpoints under the anonymous URL prefixes, used to prove the CSRF exemption. Test classpath only. */
@RestController
class TestEndpoints {

    @PostMapping("/api/public/_test/echo")
    Map<String, Object> publicEcho() {
        return Map.of("ok", true);
    }

    @PostMapping("/api/webhooks/_test/echo")
    Map<String, Object> webhookEcho() {
        return Map.of("ok", true);
    }
}
