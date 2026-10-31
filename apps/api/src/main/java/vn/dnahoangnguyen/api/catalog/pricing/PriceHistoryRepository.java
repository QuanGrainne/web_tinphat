package vn.dnahoangnguyen.api.catalog.pricing;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PriceHistoryRepository extends JpaRepository<PriceHistory, Long> {

    List<PriceHistory> findTop50BySkuIdInOrderByChangedAtDescIdDesc(Collection<Long> skuIds);
}
