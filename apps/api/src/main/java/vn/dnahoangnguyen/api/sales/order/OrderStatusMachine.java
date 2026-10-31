package vn.dnahoangnguyen.api.sales.order;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;
import org.springframework.http.HttpStatus;

/**
 * Pure order state machine.
 * COD: PENDING, CONFIRMED (shipping fee), ENTERED_KIOTVIET (KiotViet code), SHIPPING, COMPLETED.
 * BANK_TRANSFER: PENDING, CONFIRMED, PAID (manager or the bank webhook), ENTERED_KIOTVIET, SHIPPING, COMPLETED.
 * CANCELLED is reachable from every non-terminal state (from PAID only with a note); COMPLETED and CANCELLED are terminal.
 */
public final class OrderStatusMachine {

    /** Who performs the transition. {@code BANK_WEBHOOK} is the system actor of the bank notification endpoint. */
    public enum Actor {
        EDITOR,
        MANAGER,
        BANK_WEBHOOK
    }

    /** Input fields a transition can require; names match the {@code requires} values of the admin API. */
    public enum Field {
        shippingFee,
        paidAmount,
        note,
        kiotvietOrderCode
    }

    public record Edge(OrderStatus to, List<Field> requires) {
    }

    public record Current(OrderStatus status, PaymentMethod method, long total) {
    }

    public record Command(OrderStatus to, Long shippingFee, Long paidAmount, String kiotvietOrderCode, String note) {
    }

    private static final int MAX_NOTE = 500;
    private static final int MAX_KIOTVIET_CODE = 80;
    /** Upper bounds for staff-entered money, far above any real order but small enough to keep sums exact. */
    static final long MAX_SHIPPING_FEE = 100_000_000L;
    static final long MAX_PAID_AMOUNT = 100_000_000_000L;

    private OrderStatusMachine() {
    }

    /** "Chờ nhập KiotViet": COD orders in CONFIRMED and bank transfer orders in PAID. */
    public static boolean awaitsKiotVietEntry(OrderStatus status, PaymentMethod method) {
        return (method == PaymentMethod.COD && status == OrderStatus.CONFIRMED)
                || (method == PaymentMethod.BANK_TRANSFER && status == OrderStatus.PAID);
    }

    /** Order total once the shipping fee is known; figures that do not fit a long are refused instead of wrapping. */
    public static long totalWithShipping(long subtotal, long discountTotal, long shippingFee) {
        try {
            return Math.addExact(Math.subtractExact(subtotal, discountTotal), shippingFee);
        } catch (ArithmeticException e) {
            throw invalid(Field.shippingFee, "Tổng tiền đơn hàng vượt quá giới hạn cho phép.");
        }
    }

    /** Transitions the {@code actor} may start from this state, with the fields each one needs. */
    public static List<Edge> allowedTransitions(OrderStatus status, PaymentMethod method, Actor actor) {
        List<Edge> edges = new ArrayList<>();
        for (OrderStatus to : successors(status, method)) {
            if (permitted(to, actor)) {
                edges.add(new Edge(to, requiredFields(status, to)));
            }
        }
        return edges;
    }

    /**
     * Checks one transition. Unknown edge: 422 INVALID_TRANSITION; actor not allowed: 403; missing or inconsistent
     * input: 400 VALIDATION_FAILED listing the fields.
     */
    public static void validate(Current current, Command command, Actor actor) {
        OrderStatus to = command.to();
        if (to == null || !successors(current.status(), current.method()).contains(to)) {
            throw DomainException.unprocessable(ProblemCode.INVALID_TRANSITION,
                    "Không thể chuyển đơn hàng từ trạng thái \"" + current.status() + "\" sang \"" + to + "\".");
        }
        if (!permitted(to, actor)) {
            throw DomainException.forbidden(to == OrderStatus.PAID
                    ? "Chỉ quản lý mới được xác nhận đã nhận tiền."
                    : "Bạn không có quyền thực hiện thao tác này.");
        }
        if (command.note() != null && command.note().strip().length() > MAX_NOTE) {
            throw invalid(Field.note, "Ghi chú tối đa " + MAX_NOTE + " ký tự.");
        }
        switch (to) {
            case CONFIRMED -> {
                if (command.shippingFee() == null || command.shippingFee() < 0) {
                    throw invalid(Field.shippingFee, "Vui lòng nhập phí giao hàng (từ 0đ trở lên).");
                }
                if (command.shippingFee() > MAX_SHIPPING_FEE) {
                    throw invalid(Field.shippingFee, "Phí giao hàng tối đa 100.000.000đ.");
                }
            }
            case PAID -> validatePaid(current, command, actor);
            case ENTERED_KIOTVIET -> {
                String code = command.kiotvietOrderCode();
                if (code == null || code.isBlank()) {
                    throw invalid(Field.kiotvietOrderCode, "Vui lòng nhập mã đơn KiotViet.");
                }
                if (code.strip().length() > MAX_KIOTVIET_CODE) {
                    throw invalid(Field.kiotvietOrderCode, "Mã đơn KiotViet quá dài.");
                }
            }
            case CANCELLED -> {
                if (current.status() == OrderStatus.PAID && isBlank(command.note())) {
                    throw invalid(Field.note, "Đơn đã nhận tiền: vui lòng ghi chú cách hoàn tiền khi hủy.");
                }
            }
            default -> {
                // SHIPPING and COMPLETED need no input
            }
        }
    }

    private static void validatePaid(Current current, Command command, Actor actor) {
        Long paid = command.paidAmount();
        if (paid == null || paid < 0) {
            throw invalid(Field.paidAmount, "Vui lòng nhập số tiền đã nhận.");
        }
        if (paid > MAX_PAID_AMOUNT) {
            throw invalid(Field.paidAmount, "Số tiền đã nhận tối đa 100.000.000.000đ.");
        }
        if (actor == Actor.BANK_WEBHOOK) {
            // the webhook only ever pays an exact amount
            if (paid != current.total()) {
                throw DomainException.unprocessable(ProblemCode.INVALID_TRANSITION,
                        "Số tiền chuyển khoản không khớp với tổng tiền đơn hàng.");
            }
            return;
        }
        if (paid != current.total() && isBlank(command.note())) {
            throw invalid(Field.note, "Số tiền đã nhận khác tổng tiền đơn: vui lòng ghi chú lý do.");
        }
    }

    private static List<OrderStatus> successors(OrderStatus status, PaymentMethod method) {
        return switch (status) {
            case PENDING -> List.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED);
            case CONFIRMED -> method == PaymentMethod.COD
                    ? List.of(OrderStatus.ENTERED_KIOTVIET, OrderStatus.CANCELLED)
                    : List.of(OrderStatus.PAID, OrderStatus.CANCELLED);
            case PAID -> List.of(OrderStatus.ENTERED_KIOTVIET, OrderStatus.CANCELLED);
            case ENTERED_KIOTVIET -> List.of(OrderStatus.SHIPPING, OrderStatus.CANCELLED);
            case SHIPPING -> List.of(OrderStatus.COMPLETED, OrderStatus.CANCELLED);
            case COMPLETED, CANCELLED -> List.of();
        };
    }

    private static boolean permitted(OrderStatus to, Actor actor) {
        return switch (actor) {
            case MANAGER -> true;
            case EDITOR -> to != OrderStatus.PAID;
            case BANK_WEBHOOK -> to == OrderStatus.PAID;
        };
    }

    private static List<Field> requiredFields(OrderStatus from, OrderStatus to) {
        return switch (to) {
            case CONFIRMED -> List.of(Field.shippingFee);
            case PAID -> List.of(Field.paidAmount);
            case ENTERED_KIOTVIET -> List.of(Field.kiotvietOrderCode);
            case CANCELLED -> from == OrderStatus.PAID ? List.of(Field.note) : List.of();
            default -> List.of();
        };
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static DomainException invalid(Field field, String message) {
        return new DomainException(HttpStatus.BAD_REQUEST, ProblemCode.VALIDATION_FAILED, message)
                .withExtension("errors", List.of(Map.of("field", field.name(), "message", message)));
    }
}
