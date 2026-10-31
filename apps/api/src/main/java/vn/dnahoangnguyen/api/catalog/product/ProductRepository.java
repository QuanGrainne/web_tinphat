package vn.dnahoangnguyen.api.catalog.product;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Product> findByBrandId(Long brandId);

    List<Product> findByPublishedTrueAndStatus(ProductStatus status);
}
