package vn.dnahoangnguyen.api.catalog.brand;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.dnahoangnguyen.api.catalog.product.IdCount;
import vn.dnahoangnguyen.api.catalog.product.ProductRepository;
import vn.dnahoangnguyen.api.catalog.product.ProductService;
import vn.dnahoangnguyen.api.catalog.slug.SlugUtil;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;

@Service
public class BrandService {

    public record AdminBrand(long id, String name, String slug, boolean visible, long productCount) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BrandCreate(String name) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BrandUpdate(String name, Boolean visible) {
    }

    private static final int MAX_NAME = 200;

    private final BrandRepository brands;
    private final ProductRepository products;
    private final ProductService productService;

    public BrandService(BrandRepository brands, ProductRepository products, ProductService productService) {
        this.brands = brands;
        this.products = products;
        this.productService = productService;
    }

    @Transactional(readOnly = true)
    public List<AdminBrand> list() {
        Map<Long, Long> counts = new HashMap<>();
        for (IdCount row : products.countByBrand()) {
            counts.put(row.id(), row.count());
        }
        return brands.findAll().stream()
                .sorted(Comparator.comparingInt(Brand::getSortOrder).thenComparing(Brand::getName))
                .map(b -> toDto(b, counts.getOrDefault(b.getId(), 0L)))
                .toList();
    }

    @Transactional
    public AdminBrand create(BrandCreate in) {
        return toDto(createBrand(in.name()), 0);
    }

    @Transactional
    public AdminBrand update(long id, BrandUpdate in) {
        Brand brand = brands.findById(id).orElseThrow(() -> DomainException.notFound("Không tìm thấy thương hiệu."));
        String name = requireName(in.name());
        boolean renamed = !name.equals(brand.getName());
        if (renamed) {
            ensureNameFree(name, brand.getId());
            brand.setName(name);
        }
        if (in.visible() != null) {
            brand.setVisible(in.visible());
        }
        brands.save(brand);
        if (renamed) {
            productService.reindexBrand(brand.getId());
        }
        return toDto(brand, products.findByBrandId(id).size());
    }

    /** Existing brand with this name (case-insensitive), else a new one (used by the seed). */
    @Transactional
    public Brand findOrCreate(String name) {
        String wanted = name.strip();
        return brands.findAll().stream()
                .filter(b -> b.getName().equalsIgnoreCase(wanted))
                .findFirst()
                .orElseGet(() -> createBrand(wanted));
    }

    private Brand createBrand(String rawName) {
        String name = requireName(rawName);
        ensureNameFree(name, null);
        Brand brand = new Brand(name, SlugUtil.unique(SlugUtil.slugify(name, "thuong-hieu"), brands::existsBySlug));
        return brands.save(brand);
    }

    private void ensureNameFree(String name, Long selfId) {
        boolean taken = brands.findAll().stream()
                .anyMatch(b -> b.getName().equalsIgnoreCase(name) && !b.getId().equals(selfId));
        if (taken) {
            throw DomainException.conflict(ProblemCode.DUPLICATE, "Thương hiệu \"" + name + "\" đã tồn tại.");
        }
    }

    private static String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw DomainException.badRequest(ProblemCode.VALIDATION_FAILED, "Tên thương hiệu không được để trống.");
        }
        if (name.strip().length() > MAX_NAME) {
            throw DomainException.badRequest(ProblemCode.VALIDATION_FAILED, "Tên thương hiệu tối đa " + MAX_NAME + " ký tự.");
        }
        return name.strip();
    }

    private static AdminBrand toDto(Brand b, long productCount) {
        return new AdminBrand(b.getId(), b.getName(), b.getSlug(), b.isVisible(), productCount);
    }
}
