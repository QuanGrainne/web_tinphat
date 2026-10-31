package vn.dnahoangnguyen.api.common.error;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.sql.SQLException;
import java.time.Duration;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

class ProblemFormatTest {

    record Body(@NotBlank(message = "Tên không được để trống") String name) {
    }

    @RestController
    static class ThrowingController {

        @PostMapping("/t/validate")
        String validate(@Valid @RequestBody Body body) {
            return body.name();
        }

        @GetMapping("/t/not-found")
        String notFound() {
            throw DomainException.notFound("Không tìm thấy sản phẩm.");
        }

        @GetMapping("/t/priced")
        String priced() {
            throw DomainException.conflict(ProblemCode.PRICE_CHANGED, "Giá đã thay đổi.")
                    .withExtension("pricedCart", java.util.Map.of("total", 100));
        }

        @GetMapping("/t/rate")
        String rate() {
            throw DomainException.tooManyRequests("Thử lại sau.", Duration.ofSeconds(90));
        }

        @GetMapping("/t/lock")
        String lock() {
            throw new OptimisticLockingFailureException("stale");
        }

        @GetMapping("/t/unique")
        String unique() {
            throw new DataIntegrityViolationException("dup", new SQLException("duplicate key", "23505"));
        }

        @GetMapping("/t/fk")
        String fk() {
            throw new DataIntegrityViolationException("fk", new SQLException("fk violation", "23503"));
        }

        @GetMapping("/t/other-integrity")
        String otherIntegrity() {
            throw new DataIntegrityViolationException("null", new SQLException("not null", "23502"));
        }

        @GetMapping("/t/denied")
        String denied() {
            throw new AccessDeniedException("nope");
        }

        @GetMapping("/t/boom")
        String boom() {
            throw new IllegalStateException("secret internal detail");
        }
    }

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new ThrowingController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void validationErrorListsFields() throws Exception {
        mvc.perform(post("/t/validate").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.title").value("Bad Request"))
                .andExpect(jsonPath("$.instance").value("/t/validate"))
                .andExpect(jsonPath("$.errors[0].field").value("name"))
                .andExpect(jsonPath("$.errors[0].message").value("Tên không được để trống"));
    }

    @Test
    void malformedJsonIsAValidationProblem() throws Exception {
        mvc.perform(post("/t/validate").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void domainExceptionCarriesStatusCodeAndVietnameseDetail() throws Exception {
        mvc.perform(get("/t/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.detail").value("Không tìm thấy sản phẩm."));
    }

    @Test
    void extensionsBecomeTopLevelProperties() throws Exception {
        mvc.perform(get("/t/priced"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PRICE_CHANGED"))
                .andExpect(jsonPath("$.pricedCart.total").value(100));
    }

    @Test
    void rateLimitSetsRetryAfter() throws Exception {
        mvc.perform(get("/t/rate"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "90"))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }

    @Test
    void optimisticLockIsVersionConflict() throws Exception {
        mvc.perform(get("/t/lock"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));
    }

    @Test
    void uniqueViolationIsDuplicate() throws Exception {
        mvc.perform(get("/t/unique"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE"));
    }

    @Test
    void foreignKeyViolationIsConflictState() throws Exception {
        mvc.perform(get("/t/fk"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT_STATE"));
    }

    @Test
    void otherIntegrityViolationIsInternal() throws Exception {
        mvc.perform(get("/t/other-integrity"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL"));
    }

    @Test
    void accessDeniedForSignedInUserIsForbidden() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated("editor", null,
                        AuthorityUtils.createAuthorityList("ROLE_EDITOR")));
        mvc.perform(get("/t/denied"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void accessDeniedWithoutSignInIsUnauthenticated() throws Exception {
        mvc.perform(get("/t/denied"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void unexpectedErrorsNeverLeakDetails() throws Exception {
        String body = mvc.perform(get("/t/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL"))
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("secret internal detail").doesNotContain("IllegalStateException")
                .doesNotContain("at vn.dnahoangnguyen");
    }

    @Test
    void unknownPathIsNotFoundProblem() throws Exception {
        mvc.perform(get("/t/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
}
