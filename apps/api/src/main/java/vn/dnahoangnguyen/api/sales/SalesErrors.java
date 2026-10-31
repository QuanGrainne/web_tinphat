package vn.dnahoangnguyen.api.sales;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;
import vn.dnahoangnguyen.api.common.error.Problems;

/** Shared problem builders of the sales module. */
public final class SalesErrors {

    public static final String DETAIL_ORDER_NOT_FOUND =
            "Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn và số điện thoại.";

    private SalesErrors() {
    }

    /** 400 VALIDATION_FAILED naming one field. */
    public static DomainException invalidField(String field, String message) {
        return new DomainException(HttpStatus.BAD_REQUEST, ProblemCode.VALIDATION_FAILED, message)
                .withExtension("errors", List.of(Map.of("field", field, "message", message)));
    }

    /** Honeypot hit or any other submission that looks automated: indistinguishable from a validation failure. */
    public static DomainException looksAutomated() {
        return DomainException.badRequest(ProblemCode.VALIDATION_FAILED, Problems.DETAIL_VALIDATION);
    }
}
