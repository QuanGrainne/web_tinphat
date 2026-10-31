package vn.dnahoangnguyen.api.admin.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.CookieManager;
import java.net.HttpCookie;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;
import vn.dnahoangnguyen.api.admin.user.Role;
import vn.dnahoangnguyen.api.support.IntegrationTest;
import vn.dnahoangnguyen.api.support.TestAuth;

/** Runs against the embedded Tomcat, so cookie attributes and content types are the ones a browser would see. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RealServerIT extends IntegrationTest {

    @LocalServerPort
    int port;
    @Autowired
    AppUserRepository users;
    @Autowired
    PasswordEncoder encoder;

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }

    private static String form(String key1, String value1, String key2, String value2) {
        return URLEncoder.encode(key1, StandardCharsets.UTF_8) + "=" + URLEncoder.encode(value1, StandardCharsets.UTF_8)
                + "&" + URLEncoder.encode(key2, StandardCharsets.UTF_8) + "=" + URLEncoder.encode(value2, StandardCharsets.UTF_8);
    }

    @Test
    void sessionCookieIsHttpOnlyLaxAndNamedDnaSession() throws Exception {
        TestAuth.createUser(users, encoder, "real-owner", "a long enough password", Role.MANAGER);
        CookieManager cookies = new CookieManager();
        HttpClient client = HttpClient.newBuilder().cookieHandler(cookies).build();

        HttpResponse<String> csrf = client.send(HttpRequest.newBuilder(uri("/api/auth/csrf")).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(csrf.statusCode()).isEqualTo(204);
        String xsrf = cookies.getCookieStore().getCookies().stream()
                .filter(c -> c.getName().equals("XSRF-TOKEN")).map(HttpCookie::getValue).findFirst().orElseThrow();

        HttpResponse<String> login = client.send(HttpRequest.newBuilder(uri("/api/auth/login"))
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .header("X-XSRF-TOKEN", xsrf)
                        .header("CF-Connecting-IP", "10.99.0.1")
                        .POST(HttpRequest.BodyPublishers.ofString(form("username", "real-owner", "password",
                                "a long enough password")))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(login.statusCode()).isEqualTo(200);
        assertThat(login.body()).contains("\"role\":\"MANAGER\"").contains("\"username\":\"real-owner\"");
        String sessionCookie = login.headers().allValues("Set-Cookie").stream()
                .filter(c -> c.startsWith("DNA_SESSION=")).findFirst().orElseThrow();
        assertThat(sessionCookie).contains("HttpOnly").contains("SameSite=Lax").doesNotContain("Secure");

        HttpResponse<String> me = client.send(HttpRequest.newBuilder(uri("/api/admin/me")).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(me.statusCode()).isEqualTo(200);
        assertThat(me.body()).contains("\"displayName\":\"Test real-owner\"");
    }

    @Test
    void anonymousAdminCallGetsProblemJsonNotARedirect() throws Exception {
        HttpClient client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build();

        HttpResponse<String> response = client.send(HttpRequest.newBuilder(uri("/api/admin/products")).GET().build(),
                HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(401);
        assertThat(response.headers().firstValue("Content-Type").orElse("")).startsWith("application/problem+json");
        assertThat(response.body()).contains("\"code\":\"UNAUTHENTICATED\"").contains("\"status\":401");
    }

    @Test
    void unknownPublicPathIsAJsonNotFound() throws Exception {
        HttpClient client = HttpClient.newHttpClient();

        HttpResponse<String> response = client.send(HttpRequest.newBuilder(uri("/api/public/does-not-exist")).GET().build(),
                HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(404);
        assertThat(response.headers().firstValue("Content-Type").orElse("")).startsWith("application/problem+json");
        assertThat(response.body()).contains("\"code\":\"NOT_FOUND\"");
        assertThat(response.headers().allValues("Set-Cookie")).isEmpty();
    }
}
