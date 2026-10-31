package vn.dnahoangnguyen.api.sales.quote;

import java.util.List;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;

/** {@code NEW -> QUOTED -> WON | CANCELLED} and {@code NEW -> CANCELLED}; WON and CANCELLED are terminal. */
public final class QuoteStatusMachine {

    private QuoteStatusMachine() {
    }

    public static List<QuoteStatus> allowed(QuoteStatus from) {
        return switch (from) {
            case NEW -> List.of(QuoteStatus.QUOTED, QuoteStatus.CANCELLED);
            case QUOTED -> List.of(QuoteStatus.WON, QuoteStatus.CANCELLED);
            case WON, CANCELLED -> List.of();
        };
    }

    public static void validate(QuoteStatus from, QuoteStatus to) {
        if (to == null || !allowed(from).contains(to)) {
            throw DomainException.unprocessable(ProblemCode.INVALID_TRANSITION,
                    "Không thể chuyển yêu cầu báo giá từ \"" + from + "\" sang \"" + to + "\".");
        }
    }
}
