package vn.dnahoangnguyen.api.catalog.category;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import vn.dnahoangnguyen.api.catalog.CatalogIntegrationTest;
import vn.dnahoangnguyen.api.catalog.category.CategoryService.CategoryCreate;
import vn.dnahoangnguyen.api.common.error.DomainException;

class CategoryDeleteIT extends CatalogIntegrationTest {

    @Test
    void anEmptyCategoryIsDeleted() {
        long id = categoryService.create(new CategoryCreate("Trống", null)).id();
        long kept = categoryService.create(new CategoryCreate("Giữ lại", null)).id();

        categoryService.delete(id, MANAGER);

        assertThat(count("select count(*) from category where id = " + id)).isZero();
        assertThat(count("select count(*) from category where id = " + kept)).isEqualTo(1);
    }

    @Test
    void aCategoryWithProductsOrChildrenIsKeptWithAReason() {
        long parent = categoryService.create(new CategoryCreate("Cha", null)).id();
        long child = categoryService.create(new CategoryCreate("Con", parent)).id();
        long full = categoryService.create(new CategoryCreate("Có hàng", null)).id();
        create("Sản phẩm", null, full, sku("CD1", "cái", 1, true, null));

        assertThatThrownBy(() -> categoryService.delete(parent, MANAGER))
                .isInstanceOf(DomainException.class).hasMessageContaining("danh mục con");
        assertThatThrownBy(() -> categoryService.delete(full, MANAGER))
                .isInstanceOf(DomainException.class).hasMessageContaining("1 sản phẩm");
        assertThat(count("select count(*) from category")).isEqualTo(3);

        categoryService.delete(child, MANAGER);
        categoryService.delete(parent, MANAGER);
        assertThat(count("select count(*) from category")).isEqualTo(1);
    }

    @Test
    void onlyManagersDeleteAndAMissingCategoryIsNotFound() {
        long id = categoryService.create(new CategoryCreate("Của quản lý", null)).id();

        assertThatThrownBy(() -> categoryService.delete(id, EDITOR)).isInstanceOf(DomainException.class);
        assertThat(count("select count(*) from category where id = " + id)).isEqualTo(1);
        assertThatThrownBy(() -> categoryService.delete(99_999, MANAGER)).isInstanceOf(DomainException.class);
    }
}
