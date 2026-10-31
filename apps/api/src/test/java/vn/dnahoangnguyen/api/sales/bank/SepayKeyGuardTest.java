package vn.dnahoangnguyen.api.sales.bank;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class SepayKeyGuardTest {

    private static final String STRONG = "q7Hx2mVn9Rb4TzLc8WyKd3PfGs6JuAe1";
    private static final String OTHER_STRONG = "N4pW8sYb2KcHq6ZxM9vTr3JdLg5Fa7Ue";

    private static MockEnvironment environment(String... profiles) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(profiles);
        return environment;
    }

    private static SepayProperties sepay(boolean enabled, String... keys) {
        return new SepayProperties(enabled, List.of(keys), "0123456789");
    }

    @Test
    void realKeysStartInProd() {
        assertThat(STRONG).hasSize(32);
        assertThatCode(() -> new SepayKeyGuard(sepay(true, STRONG, OTHER_STRONG), environment("prod")))
                .doesNotThrowAnyException();
    }

    @Test
    void aShortKeyStopsProd() {
        assertThatThrownBy(() -> new SepayKeyGuard(sepay(true, STRONG, STRONG.substring(1)), environment("prod")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("key 2")
                .hasMessageContaining("fewer than 32");
        assertThatThrownBy(() -> new SepayKeyGuard(sepay(true, "key-one"), environment("docker", "prod")))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void placeholderWordsStopProdInAnyCase() {
        for (String word : List.of("change-me", "CHANGE-ME", "dev-", "Dev-", "example", "EXAMPLE", "test", "TeSt",
                "secret", "SECRET")) {
            String key = "q7Hx2mVn9Rb4TzLc8WyKd3Pf" + word + "Gs6J";
            assertThat(key.length()).isGreaterThanOrEqualTo(32);
            assertThatThrownBy(() -> new SepayKeyGuard(sepay(true, key), environment("prod")))
                    .as(word)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("placeholder");
        }
    }

    @Test
    void theMessageNeverRepeatsTheKey() {
        String weak = "tooShortToBeReal";
        assertThatThrownBy(() -> new SepayKeyGuard(sepay(true, weak), environment("prod")))
                .hasMessageNotContaining(weak);
        assertThat(SepayKeyGuard.problem(List.of(STRONG))).isEmpty();
    }

    @Test
    void otherProfilesAndDisabledSepayAreNotChecked() {
        assertThatCode(() -> new SepayKeyGuard(sepay(true, "key-one"), environment("docker", "mail")))
                .doesNotThrowAnyException();
        assertThatCode(() -> new SepayKeyGuard(sepay(true, "key-one"), environment()))
                .doesNotThrowAnyException();
        assertThatCode(() -> new SepayKeyGuard(sepay(false, "key-one"), environment("prod")))
                .doesNotThrowAnyException();
    }
}
