package vn.dnahoangnguyen.api.catalog.slug;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.Test;

class SlugUtilTest {

    @Test
    void slugifiesVietnameseNames() {
        assertThat(SlugUtil.slugify("Giấy rút đáy Sen Vàng", "san-pham")).isEqualTo("giay-rut-day-sen-vang");
        assertThat(SlugUtil.slugify("Pin Con Thỏ Đại - R20S", "san-pham")).isEqualTo("pin-con-tho-dai-r20s");
        assertThat(SlugUtil.slugify("Giấy ăn & giấy vệ sinh", "san-pham")).isEqualTo("giay-an-giay-ve-sinh");
        assertThat(SlugUtil.slugify("Pin 9V- Vuông", "san-pham")).isEqualTo("pin-9v-vuong");
    }

    @Test
    void fallbackWhenNothingUsable() {
        assertThat(SlugUtil.slugify("!!!", "san-pham")).isEqualTo("san-pham");
        assertThat(SlugUtil.slugify("", "san-pham")).isEqualTo("san-pham");
        assertThat(SlugUtil.slugify(null, "san-pham")).isEqualTo("san-pham");
    }

    @Test
    void longNamesAreCutAtAHyphen() {
        String name = "giay ve sinh ".repeat(20);
        String slug = SlugUtil.slugify(name, "san-pham");
        assertThat(slug.length()).isLessThanOrEqualTo(SlugUtil.MAX_LENGTH);
        assertThat(slug).doesNotStartWith("-").doesNotEndWith("-");
        assertThat(slug).matches("[a-z0-9]+(-[a-z0-9]+)*");
        assertThat(slug).isEqualTo("giay-ve-sinh-giay-ve-sinh-giay-ve-sinh-giay-ve-sinh-giay-ve-sinh-giay-ve-sinh");
    }

    @Test
    void uniqueAppendsNumericSuffix() {
        Set<String> taken = Set.of("giay", "giay-2");
        assertThat(SlugUtil.unique("giay", taken::contains)).isEqualTo("giay-3");
        assertThat(SlugUtil.unique("khac", taken::contains)).isEqualTo("khac");
    }
}
