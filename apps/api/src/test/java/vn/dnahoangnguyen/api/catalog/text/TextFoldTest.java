package vn.dnahoangnguyen.api.catalog.text;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TextFoldTest {

    @Test
    void stripsDiacriticsAndDStroke() {
        assertThat(TextFold.fold("Giấy rút đáy")).isEqualTo("giay rut day");
        assertThat(TextFold.fold("SVRĐ1280t")).isEqualTo("svrd1280t");
        assertThat(TextFold.fold("ĐẠI")).isEqualTo("dai");
    }

    @Test
    void collapsesSpacesAndHandlesNull() {
        assertThat(TextFold.fold("  Pin   Con\tThỏ ")).isEqualTo("pin con tho");
        assertThat(TextFold.fold(null)).isEmpty();
    }

    @Test
    void decomposedInputFoldsTheSame() {
        assertThat(TextFold.fold("Gói")).isEqualTo("goi");
    }
}
