package vn.dnahoangnguyen.api.common.error;

/** Machine-readable error code carried in the {@code code} property of every problem response. */
public enum ProblemCode {
    VALIDATION_FAILED,
    UNAUTHENTICATED,
    FORBIDDEN,
    NOT_FOUND,
    VERSION_CONFLICT,
    DUPLICATE,
    RATE_LIMITED,
    CONFLICT_STATE,
    FILE_REJECTED,
    INTERNAL,
    CATEGORY_NOT_EMPTY,
    BRAND_NOT_EMPTY,
    PUBLISH_REQUIREMENTS_UNMET,
    FORBIDDEN_FIELD,
    PRICE_CHANGED,
    SKU_NOT_ORDERABLE,
    CAPTCHA_FAILED,
    CAPTCHA_REQUIRED,
    INVALID_TRANSITION
}
