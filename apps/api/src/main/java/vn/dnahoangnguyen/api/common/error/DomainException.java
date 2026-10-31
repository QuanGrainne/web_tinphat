package vn.dnahoangnguyen.api.common.error;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;

/**
 * Business-rule failure that maps one-to-one to a problem response. {@code detailVi} is shown to the user as is.
 * Extensions become top-level properties of the problem body (for example {@code pricedCart} on PRICE_CHANGED).
 */
public class DomainException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final HttpStatus status;
    private final ProblemCode code;
    private final String detailVi;
    private final Map<String, Object> extensions = new LinkedHashMap<>();
    private final List<Problems.FieldViolation> fieldErrors = new ArrayList<>();
    private Duration retryAfter;

    public DomainException(HttpStatus status, ProblemCode code, String detailVi) {
        // control-flow exception: no stack trace needed
        super(detailVi, null, false, false);
        this.status = status;
        this.code = code;
        this.detailVi = detailVi;
    }

    public static DomainException notFound(String detailVi) {
        return new DomainException(HttpStatus.NOT_FOUND, ProblemCode.NOT_FOUND, detailVi);
    }

    public static DomainException badRequest(ProblemCode code, String detailVi) {
        return new DomainException(HttpStatus.BAD_REQUEST, code, detailVi);
    }

    public static DomainException conflict(ProblemCode code, String detailVi) {
        return new DomainException(HttpStatus.CONFLICT, code, detailVi);
    }

    public static DomainException unprocessable(ProblemCode code, String detailVi) {
        return new DomainException(HttpStatus.UNPROCESSABLE_ENTITY, code, detailVi);
    }

    public static DomainException forbidden(String detailVi) {
        return new DomainException(HttpStatus.FORBIDDEN, ProblemCode.FORBIDDEN, detailVi);
    }

    /** 403 for a field only managers may change; the field name travels in the {@code field} extension. */
    public static DomainException forbiddenField(String field, String detailVi) {
        return new DomainException(HttpStatus.FORBIDDEN, ProblemCode.FORBIDDEN_FIELD, detailVi)
                .withExtension("field", field);
    }

    public static DomainException tooManyRequests(String detailVi, Duration retryAfter) {
        DomainException ex = new DomainException(HttpStatus.TOO_MANY_REQUESTS, ProblemCode.RATE_LIMITED, detailVi);
        ex.retryAfter = retryAfter;
        return ex;
    }

    /** Adds a top-level property to the problem body. Returns {@code this} for chaining. */
    public DomainException withExtension(String key, Object value) {
        extensions.put(key, value);
        return this;
    }

    /** Adds an entry to the {@code errors} array of the problem body. Returns {@code this} for chaining. */
    public DomainException withFieldError(String field, String message) {
        fieldErrors.add(new Problems.FieldViolation(field, message));
        return this;
    }

    public List<Problems.FieldViolation> fieldErrors() {
        return List.copyOf(fieldErrors);
    }

    public HttpStatus status() {
        return status;
    }

    public ProblemCode code() {
        return code;
    }

    public String detailVi() {
        return detailVi;
    }

    public Map<String, Object> extensions() {
        return Map.copyOf(extensions);
    }

    /** Only set for RATE_LIMITED; drives the {@code Retry-After} header. */
    public Duration retryAfter() {
        return retryAfter;
    }
}
