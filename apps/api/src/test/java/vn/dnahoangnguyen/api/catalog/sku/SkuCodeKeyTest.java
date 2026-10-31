package vn.dnahoangnguyen.api.catalog.sku;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SkuCodeKeyTest {

    @Test
    void lookAlikeSpellingsShareOneKey() {
        String key = "SV465-4L- GÓI";
        assertThat(SkuCodeKey.of("SV465-4L- Gói")).isEqualTo(key);
        assertThat(SkuCodeKey.of(" SV465-4L-  Gói ")).isEqualTo(key);
        assertThat(SkuCodeKey.of("SV465-4L- Gói")).isEqualTo(key);
        assertThat(SkuCodeKey.of("SV465-4L- Gói")).isEqualTo(key);
    }

    @Test
    void differentSpacingOrLettersGiveDifferentKeys() {
        assertThat(SkuCodeKey.of("SV465-4L-Gói")).isNotEqualTo(SkuCodeKey.of("SV465-4L- Gói"));
        assertThat(SkuCodeKey.of("SVRD1280t 6G")).isNotEqualTo(SkuCodeKey.of("SVRĐ1280t 6G"));
    }

    @Test
    void caseIsFoldedAndDStrokeKept() {
        assertThat(SkuCodeKey.of("SVRĐ1280t 6G")).isEqualTo("SVRĐ1280T 6G");
        assertThat(SkuCodeKey.of("svrđ1280t 6g")).isEqualTo("SVRĐ1280T 6G");
    }

    @Test
    void unicodeDashesBecomeHyphens() {
        assertThat(SkuCodeKey.of("SV465–4L- Gói")).isEqualTo("SV465-4L- GÓI");
        assertThat(SkuCodeKey.of("SV465−4L")).isEqualTo("SV465-4L");
    }

    @Test
    void dotsAndParenthesesSurviveAndZeroWidthIsDropped() {
        assertThat(SkuCodeKey.of("SV12C1.4Kg 4L(SV1412) G")).isEqualTo("SV12C1.4KG 4L(SV1412) G");
        assertThat(SkuCodeKey.of("SV​465﻿")).isEqualTo("SV465");
    }

    @Test
    void nullIsEmpty() {
        assertThat(SkuCodeKey.of(null)).isEmpty();
    }
}
