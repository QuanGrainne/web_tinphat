package vn.dnahoangnguyen.api.catalog.sku;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SkuRepository extends JpaRepository<Sku, Long> {

    List<Sku> findByProductId(Long productId);

    List<Sku> findByProductIdIn(Collection<Long> productIds);

    List<Sku> findByProductIdInAndVisibleTrue(Collection<Long> productIds);

    List<Sku> findByCodeKeyIn(Collection<String> codeKeys);
}
