package vn.dnahoangnguyen.api.sales.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;
import vn.dnahoangnguyen.api.sales.order.OrderStatusMachine.Actor;
import vn.dnahoangnguyen.api.sales.order.OrderStatusMachine.Command;
import vn.dnahoangnguyen.api.sales.order.OrderStatusMachine.Current;
import vn.dnahoangnguyen.api.sales.order.OrderStatusMachine.Edge;
import vn.dnahoangnguyen.api.sales.order.OrderStatusMachine.Field;

class OrderStatusMachineTest {

    private static final long TOTAL = 93_000;

    private static Current cod(OrderStatus status) {
        return new Current(status, PaymentMethod.COD, TOTAL);
    }

    private static Current bank(OrderStatus status) {
        return new Current(status, PaymentMethod.BANK_TRANSFER, TOTAL);
    }

    private static Command to(OrderStatus to) {
        return new Command(to, null, null, null, null);
    }

    private static List<OrderStatus> targets(Current current, Actor actor) {
        return OrderStatusMachine.allowedTransitions(current.status(), current.method(), actor).stream()
                .map(Edge::to).toList();
    }

    @Test
    void codHappyPathUsesEveryEdge() {
        assertThatCode(() -> {
            OrderStatusMachine.validate(cod(OrderStatus.PENDING),
                    new Command(OrderStatus.CONFIRMED, 30_000L, null, null, null), Actor.EDITOR);
            OrderStatusMachine.validate(cod(OrderStatus.CONFIRMED),
                    new Command(OrderStatus.ENTERED_KIOTVIET, null, null, "KV001", null), Actor.EDITOR);
            OrderStatusMachine.validate(cod(OrderStatus.ENTERED_KIOTVIET), to(OrderStatus.SHIPPING), Actor.EDITOR);
            OrderStatusMachine.validate(cod(OrderStatus.SHIPPING), to(OrderStatus.COMPLETED), Actor.EDITOR);
        }).doesNotThrowAnyException();
    }

    @Test
    void bankHappyPathGoesThroughPaid() {
        assertThatCode(() -> {
            OrderStatusMachine.validate(bank(OrderStatus.PENDING),
                    new Command(OrderStatus.CONFIRMED, 0L, null, null, null), Actor.EDITOR);
            OrderStatusMachine.validate(bank(OrderStatus.CONFIRMED),
                    new Command(OrderStatus.PAID, null, TOTAL, null, null), Actor.MANAGER);
            OrderStatusMachine.validate(bank(OrderStatus.PAID),
                    new Command(OrderStatus.ENTERED_KIOTVIET, null, null, "KV002", null), Actor.EDITOR);
            OrderStatusMachine.validate(bank(OrderStatus.ENTERED_KIOTVIET), to(OrderStatus.SHIPPING), Actor.EDITOR);
            OrderStatusMachine.validate(bank(OrderStatus.SHIPPING), to(OrderStatus.COMPLETED), Actor.EDITOR);
        }).doesNotThrowAnyException();
    }

    @Test
    void codCanNeverBePaid() {
        assertThatThrownBy(() -> OrderStatusMachine.validate(cod(OrderStatus.CONFIRMED),
                new Command(OrderStatus.PAID, null, TOTAL, null, null), Actor.MANAGER))
                .isInstanceOfSatisfying(DomainException.class, e -> assertThat(e.code()).isEqualTo(ProblemCode.INVALID_TRANSITION));
        assertThat(targets(cod(OrderStatus.CONFIRMED), Actor.MANAGER))
                .containsExactly(OrderStatus.ENTERED_KIOTVIET, OrderStatus.CANCELLED);
    }

    @Test
    void bankTransferCannotSkipPaid() {
        assertThatThrownBy(() -> OrderStatusMachine.validate(bank(OrderStatus.CONFIRMED),
                new Command(OrderStatus.ENTERED_KIOTVIET, null, null, "KV", null), Actor.MANAGER))
                .isInstanceOfSatisfying(DomainException.class, e -> assertThat(e.code()).isEqualTo(ProblemCode.INVALID_TRANSITION));
    }

    @Test
    void confirmedNeedsAShippingFeeOfZeroOrMore() {
        assertThatThrownBy(() -> OrderStatusMachine.validate(cod(OrderStatus.PENDING), to(OrderStatus.CONFIRMED), Actor.EDITOR))
                .isInstanceOfSatisfying(DomainException.class, e -> {
                    assertThat(e.status()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(e.code()).isEqualTo(ProblemCode.VALIDATION_FAILED);
                });
        assertThatThrownBy(() -> OrderStatusMachine.validate(cod(OrderStatus.PENDING),
                new Command(OrderStatus.CONFIRMED, -1L, null, null, null), Actor.EDITOR))
                .isInstanceOf(DomainException.class);
        assertThatCode(() -> OrderStatusMachine.validate(cod(OrderStatus.PENDING),
                new Command(OrderStatus.CONFIRMED, 0L, null, null, null), Actor.EDITOR)).doesNotThrowAnyException();
    }

    @Test
    void enteredKiotvietNeedsTheKiotvietCode() {
        assertThatThrownBy(() -> OrderStatusMachine.validate(cod(OrderStatus.CONFIRMED),
                new Command(OrderStatus.ENTERED_KIOTVIET, null, null, "  ", null), Actor.EDITOR))
                .isInstanceOfSatisfying(DomainException.class, e -> assertThat(e.code()).isEqualTo(ProblemCode.VALIDATION_FAILED));
    }

    @Test
    void paidNeedsTheAmountAndANoteWhenItDiffersFromTheTotal() {
        assertThatThrownBy(() -> OrderStatusMachine.validate(bank(OrderStatus.CONFIRMED), to(OrderStatus.PAID), Actor.MANAGER))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> OrderStatusMachine.validate(bank(OrderStatus.CONFIRMED),
                new Command(OrderStatus.PAID, null, TOTAL - 1, null, null), Actor.MANAGER))
                .isInstanceOf(DomainException.class);
        assertThatCode(() -> OrderStatusMachine.validate(bank(OrderStatus.CONFIRMED),
                new Command(OrderStatus.PAID, null, TOTAL - 1, null, "Khách trừ phí chuyển"), Actor.MANAGER))
                .doesNotThrowAnyException();
    }

    @Test
    void editorCannotMarkPaid() {
        assertThatThrownBy(() -> OrderStatusMachine.validate(bank(OrderStatus.CONFIRMED),
                new Command(OrderStatus.PAID, null, TOTAL, null, null), Actor.EDITOR))
                .isInstanceOfSatisfying(DomainException.class, e -> assertThat(e.status()).isEqualTo(HttpStatus.FORBIDDEN));
        assertThat(targets(bank(OrderStatus.CONFIRMED), Actor.EDITOR)).containsExactly(OrderStatus.CANCELLED);
        assertThat(targets(bank(OrderStatus.CONFIRMED), Actor.MANAGER)).contains(OrderStatus.PAID);
    }

    @Test
    void webhookMayPayOnlyAConfirmedBankOrderWithTheExactAmount() {
        Command exact = new Command(OrderStatus.PAID, null, TOTAL, null, null);
        assertThatCode(() -> OrderStatusMachine.validate(bank(OrderStatus.CONFIRMED), exact, Actor.BANK_WEBHOOK))
                .doesNotThrowAnyException();
        for (Current other : List.of(bank(OrderStatus.PENDING), cod(OrderStatus.CONFIRMED), bank(OrderStatus.PAID))) {
            assertThatThrownBy(() -> OrderStatusMachine.validate(other, exact, Actor.BANK_WEBHOOK))
                    .isInstanceOfSatisfying(DomainException.class,
                            e -> assertThat(e.code()).isEqualTo(ProblemCode.INVALID_TRANSITION));
        }
        assertThatThrownBy(() -> OrderStatusMachine.validate(bank(OrderStatus.CONFIRMED),
                new Command(OrderStatus.PAID, null, TOTAL + 1, null, "x"), Actor.BANK_WEBHOOK))
                .isInstanceOfSatisfying(DomainException.class,
                        e -> assertThat(e.code()).isEqualTo(ProblemCode.INVALID_TRANSITION));
        assertThatThrownBy(() -> OrderStatusMachine.validate(bank(OrderStatus.CONFIRMED), to(OrderStatus.CANCELLED), Actor.BANK_WEBHOOK))
                .isInstanceOfSatisfying(DomainException.class, e -> assertThat(e.status()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void cancellingAPaidOrderNeedsARefundNote() {
        assertThatThrownBy(() -> OrderStatusMachine.validate(bank(OrderStatus.PAID), to(OrderStatus.CANCELLED), Actor.MANAGER))
                .isInstanceOfSatisfying(DomainException.class, e -> assertThat(e.code()).isEqualTo(ProblemCode.VALIDATION_FAILED));
        assertThatCode(() -> OrderStatusMachine.validate(bank(OrderStatus.PAID),
                new Command(OrderStatus.CANCELLED, null, null, null, "Hoàn tiền qua chuyển khoản"), Actor.MANAGER))
                .doesNotThrowAnyException();
        assertThatCode(() -> OrderStatusMachine.validate(bank(OrderStatus.CONFIRMED), to(OrderStatus.CANCELLED), Actor.EDITOR))
                .doesNotThrowAnyException();
    }

    @Test
    void cancelIsOpenFromEveryNonTerminalState() {
        for (OrderStatus status : List.of(OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.ENTERED_KIOTVIET,
                OrderStatus.SHIPPING)) {
            assertThat(targets(cod(status), Actor.EDITOR)).contains(OrderStatus.CANCELLED);
        }
        assertThat(targets(bank(OrderStatus.PAID), Actor.MANAGER)).contains(OrderStatus.CANCELLED);
    }

    @Test
    void terminalStatesRejectEverything() {
        for (OrderStatus terminal : List.of(OrderStatus.COMPLETED, OrderStatus.CANCELLED)) {
            assertThat(targets(cod(terminal), Actor.MANAGER)).isEmpty();
            for (OrderStatus to : OrderStatus.values()) {
                assertThatThrownBy(() -> OrderStatusMachine.validate(cod(terminal), to(to), Actor.MANAGER))
                        .isInstanceOf(DomainException.class);
            }
        }
    }

    @Test
    void allowedTransitionsListTheRequiredFields() {
        List<Edge> edges = OrderStatusMachine.allowedTransitions(OrderStatus.PENDING, PaymentMethod.COD, Actor.EDITOR);
        assertThat(edges).containsExactly(new Edge(OrderStatus.CONFIRMED, List.of(Field.shippingFee)),
                new Edge(OrderStatus.CANCELLED, List.of()));
        assertThat(OrderStatusMachine.allowedTransitions(OrderStatus.PAID, PaymentMethod.BANK_TRANSFER, Actor.MANAGER))
                .containsExactly(new Edge(OrderStatus.ENTERED_KIOTVIET, List.of(Field.kiotvietOrderCode)),
                        new Edge(OrderStatus.CANCELLED, List.of(Field.note)));
    }

    @Test
    void awaitsKiotVietEntryIsCodConfirmedOrBankPaid() {
        assertThat(OrderStatusMachine.awaitsKiotVietEntry(OrderStatus.CONFIRMED, PaymentMethod.COD)).isTrue();
        assertThat(OrderStatusMachine.awaitsKiotVietEntry(OrderStatus.CONFIRMED, PaymentMethod.BANK_TRANSFER)).isFalse();
        assertThat(OrderStatusMachine.awaitsKiotVietEntry(OrderStatus.PAID, PaymentMethod.BANK_TRANSFER)).isTrue();
        assertThat(OrderStatusMachine.awaitsKiotVietEntry(OrderStatus.PENDING, PaymentMethod.COD)).isFalse();
        assertThat(OrderStatusMachine.awaitsKiotVietEntry(OrderStatus.ENTERED_KIOTVIET, PaymentMethod.COD)).isFalse();
    }
}
