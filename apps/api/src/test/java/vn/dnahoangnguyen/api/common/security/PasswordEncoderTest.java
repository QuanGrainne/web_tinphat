package vn.dnahoangnguyen.api.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class PasswordEncoderTest {

    private final PasswordEncoder encoder = new SecurityConfig().passwordEncoder(4);

    @Test
    void newHashesCarryTheBcryptPrefixAndVerify() {
        String hash = encoder.encode("correct horse battery");
        assertThat(hash).startsWith("{bcrypt}");
        assertThat(encoder.matches("correct horse battery", hash)).isTrue();
        assertThat(encoder.matches("wrong horse battery", hash)).isFalse();
    }

    @Test
    void rawBcryptHashFromTheSqlRunbookStillVerifies() {
        String raw = new BCryptPasswordEncoder(4).encode("pasted by hand");
        assertThat(raw).doesNotStartWith("{");
        assertThat(encoder.matches("pasted by hand", raw)).isTrue();
        assertThat(encoder.matches("something else", raw)).isFalse();
    }
}
