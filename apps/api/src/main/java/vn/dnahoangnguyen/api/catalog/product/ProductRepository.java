package vn.dnahoangnguyen.api.catalog.product;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Product> findByBrandId(Long brandId);

    List<Product> findByPublishedTrueAndStatus(ProductStatus status);

    @Query("select new vn.dnahoangnguyen.api.catalog.product.IdCount(p.categoryId, count(p)) "
            + "from Product p where p.categoryId is not null group by p.categoryId")
    List<IdCount> countByCategory();

    @Query("select new vn.dnahoangnguyen.api.catalog.product.IdCount(p.brandId, count(p)) "
            + "from Product p where p.brandId is not null group by p.brandId")
    List<IdCount> countByBrand();
}
