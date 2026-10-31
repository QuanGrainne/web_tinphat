package vn.dnahoangnguyen.api.sales.quote;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;

class QuoteStatusMachineTest {

    @Test
    void listsTheForwardEdges() {
        assertThat(QuoteStatusMachine.allowed(QuoteStatus.NEW)).containsExactly(QuoteStatus.QUOTED, QuoteStatus.CANCELLED);
        assertThat(QuoteStatusMachine.allowed(QuoteStatus.QUOTED)).containsExactly(QuoteStatus.WON, QuoteStatus.CANCELLED);
    }

    @Test
    void wonAndCancelledAreTerminal() {
        assertThat(QuoteStatusMachine.allowed(QuoteStatus.WON)).isEmpty();
        assertThat(QuoteStatusMachine.allowed(QuoteStatus.CANCELLED)).isEmpty();
    }

    @Test
    void acceptsValidAndRejectsInvalidEdges() {
        assertThatCode(() -> QuoteStatusMachine.validate(QuoteStatus.NEW, QuoteStatus.QUOTED)).doesNotThrowAnyException();
        assertThatCode(() -> QuoteStatusMachine.validate(QuoteStatus.NEW, QuoteStatus.CANCELLED)).doesNotThrowAnyException();
        assertThatThrownBy(() -> QuoteStatusMachine.validate(QuoteStatus.NEW, QuoteStatus.WON))
                .isInstanceOfSatisfying(DomainException.class, e -> assertThat(e.code()).isEqualTo(ProblemCode.INVALID_TRANSITION));
        assertThatThrownBy(() -> QuoteStatusMachine.validate(QuoteStatus.WON, QuoteStatus.NEW))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> QuoteStatusMachine.validate(QuoteStatus.NEW, null)).isInstanceOf(DomainException.class);
    }
}
