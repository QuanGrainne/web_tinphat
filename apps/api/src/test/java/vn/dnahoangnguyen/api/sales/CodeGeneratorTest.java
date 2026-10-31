package vn.dnahoangnguyen.api.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

class CodeGeneratorTest {

    private final CodeGenerator generator = new CodeGenerator();

    @Test
    void orderCodesHaveThePrefixAndSixCrockfordCharacters() {
        Pattern pattern = Pattern.compile("^DNA[0-9A-HJKMNP-TV-Z]{6}$");
        for (int i = 0; i < 1_000; i++) {
            assertThat(generator.generate(CodeGenerator.ORDER_PREFIX)).matches(pattern);
        }
    }

    @Test
    void quoteCodesUseTheQuotePrefix() {
        assertThat(generator.generate(CodeGenerator.QUOTE_PREFIX)).matches("^BG[0-9A-HJKMNP-TV-Z]{6}$");
    }

    @Test
    void tenThousandSuffixesNeverContainAmbiguousLetters() {
        for (int i = 0; i < 10_000; i++) {
            String suffix = generator.generate("").toUpperCase();
            assertThat(suffix).doesNotContain("I", "L", "O", "U");
        }
    }

    @Test
    void collisionsAreRetriedThenSucceed() {
        AtomicInteger calls = new AtomicInteger();
        String code = generator.generateUnique("DNA", c -> calls.incrementAndGet() <= CodeGenerator.MAX_RETRIES);
        assertThat(code).startsWith("DNA");
        assertThat(calls.get()).isEqualTo(CodeGenerator.MAX_RETRIES + 1);
    }

    @Test
    void failsWhenEveryDrawCollides() {
        AtomicInteger calls = new AtomicInteger();
        assertThatThrownBy(() -> generator.generateUnique("DNA", c -> {
            calls.incrementAndGet();
            return true;
        })).isInstanceOf(IllegalStateException.class);
        assertThat(calls.get()).isEqualTo(CodeGenerator.MAX_RETRIES + 1);
    }

    @Test
    void normalizeUppercasesDropsSeparatorsAndFoldsLookAlikes() {
        assertThat(CodeGenerator.normalize("dna 7k2m-9q")).isEqualTo("DNA7K2M9Q");
        assertThat(CodeGenerator.normalize("  DNA7K2MOQ ")).isEqualTo("DNA7K2M0Q");
        assertThat(CodeGenerator.normalize("dnai1l")).isEqualTo("DNA111");
        assertThat(CodeGenerator.normalize(null)).isEmpty();
    }
}
