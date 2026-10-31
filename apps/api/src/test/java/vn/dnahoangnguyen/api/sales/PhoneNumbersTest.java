package vn.dnahoangnguyen.api.sales;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PhoneNumbersTest {

    @Test
    void normalizesLocalAndInternationalForms() {
        assertThat(PhoneNumbers.normalize("0912 345 678")).contains("0912345678");
        assertThat(PhoneNumbers.normalize("+84912345678")).contains("0912345678");
        assertThat(PhoneNumbers.normalize("84 912.345.678")).contains("0912345678");
        assertThat(PhoneNumbers.normalize("(091) 234-5678")).contains("0912345678");
    }

    @Test
    void acceptsElevenDigitNumbersAndRejectsTheRest() {
        assertThat(PhoneNumbers.normalize("01234567890")).contains("01234567890");
        assertThat(PhoneNumbers.normalize("12345")).isEmpty();
        assertThat(PhoneNumbers.normalize("912345678")).isEmpty();
        assertThat(PhoneNumbers.normalize("abc")).isEmpty();
        assertThat(PhoneNumbers.normalize(null)).isEmpty();
    }

    @Test
    void masksTheMiddleDigits() {
        assertThat(PhoneNumbers.mask("0912345678")).isEqualTo("0912 *** 678");
        assertThat(PhoneNumbers.mask("")).isEmpty();
    }
}
