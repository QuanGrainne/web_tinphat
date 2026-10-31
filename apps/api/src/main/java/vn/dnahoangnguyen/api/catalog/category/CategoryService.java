package vn.dnahoangnguyen.api.catalog.category;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.dnahoangnguyen.api.catalog.product.ChangeActor;
import vn.dnahoangnguyen.api.catalog.product.IdCount;
import vn.dnahoangnguyen.api.catalog.product.ProductRepository;
import vn.dnahoangnguyen.api.catalog.slug.SlugUtil;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;

/** Two-level product groups. Level-1 counts include the products of their children. */
@Service
public class CategoryService {

    public record AdminCategory(long id, String name, String slug, Long parentId, String description, boolean visible,
                                int sortOrder, long productCount, List<AdminCategory> children) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CategoryCreate(String name, Long parentId) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CategoryUpdate(String name, String description, Boolean visible, Integer sortOrder) {
    }

    private static final int MAX_NAME = 200;

    private final CategoryRepository categories;
    private final ProductRepository products;

    public CategoryService(CategoryRepository categories, ProductRepository products) {
        this.categories = categories;
        this.products = products;
    }

    @Transactional(readOnly = true)
    public List<AdminCategory> tree() {
        Map<Long, Long> counts = new HashMap<>();
        for (IdCount row : products.countByCategory()) {
            counts.put(row.id(), row.count());
        }
        List<Category> all = categories.findAll().stream().sorted(order()).toList();
        List<AdminCategory> roots = new ArrayList<>();
        for (Category root : all) {
            if (root.getParentId() != null) {
                continue;
            }
            List<AdminCategory> children = all.stream()
                    .filter(c -> root.getId().equals(c.getParentId()))
                    .map(c -> toDto(c, counts.getOrDefault(c.getId(), 0L), List.of()))
                    .toList();
            long total = counts.getOrDefault(root.getId(), 0L) + children.stream().mapToLong(AdminCategory::productCount).sum();
            roots.add(toDto(root, total, children));
        }
        return roots;
    }

    @Transactional
    public AdminCategory create(CategoryCreate in) {
        Category category = createCategory(in.name(), in.parentId());
        return toDto(category, 0, List.of());
    }

    /** Showing or hiding a group decides what the storefront publishes, so changing {@code visible} is for managers. */
    @Transactional
    public AdminCategory update(long id, CategoryUpdate in, ChangeActor actor) {
        Category category = categories.findById(id).orElseThrow(() -> DomainException.notFound("Không tìm thấy nhóm hàng."));
        if (in.visible() != null && in.visible() != category.isVisible()) {
            actor.requireManager("visible", "Chỉ quản lý mới được ẩn hoặc hiện nhóm hàng.");
        }
        String name = requireName(in.name());
        boolean renamed = !name.equals(category.getName());
        if (renamed) {
            ensureNameFree(name, category.getParentId(), category.getId());
            category.setName(name);
        }
        category.setDescription(in.description() == null || in.description().isBlank() ? null : in.description());
        if (in.visible() != null) {
            category.setVisible(in.visible());
        }
        if (in.sortOrder() != null) {
            category.setSortOrder(in.sortOrder());
        }
        categories.save(category);
        return toDto(category, 0, List.of());
    }

    /** Existing category with this name under the parent, else a new one (used by the seed). */
    @Transactional
    public Category findOrCreate(String name, Long parentId) {
        String wanted = name.strip();
        return categories.findAll().stream()
                .filter(c -> java.util.Objects.equals(c.getParentId(), parentId) && c.getName().equalsIgnoreCase(wanted))
                .findFirst()
                .orElseGet(() -> createCategory(wanted, parentId));
    }

    private Category createCategory(String rawName, Long parentId) {
        String name = requireName(rawName);
        if (parentId != null) {
            Category parent = categories.findById(parentId)
                    .orElseThrow(() -> DomainException.badRequest(ProblemCode.VALIDATION_FAILED, "Nhóm hàng cha không tồn tại."));
            if (parent.getParentId() != null) {
                throw DomainException.unprocessable(ProblemCode.VALIDATION_FAILED, "Nhóm hàng chỉ có tối đa 2 cấp.");
            }
        }
        ensureNameFree(name, parentId, null);
        long siblings = categories.findAll().stream().filter(c -> java.util.Objects.equals(c.getParentId(), parentId)).count();
        Category category = new Category(name, SlugUtil.unique(SlugUtil.slugify(name, "nhom-hang"), categories::existsBySlug), parentId);
        category.setSortOrder((int) siblings);
        return categories.save(category);
    }

    private void ensureNameFree(String name, Long parentId, Long selfId) {
        boolean taken = categories.findAll().stream()
                .anyMatch(c -> java.util.Objects.equals(c.getParentId(), parentId) && c.getName().equalsIgnoreCase(name)
                        && !c.getId().equals(selfId));
        if (taken) {
            throw DomainException.conflict(ProblemCode.DUPLICATE, "Nhóm hàng \"" + name + "\" đã tồn tại.");
        }
    }

    private static String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw DomainException.badRequest(ProblemCode.VALIDATION_FAILED, "Tên nhóm hàng không được để trống.");
        }
        if (name.strip().length() > MAX_NAME) {
            throw DomainException.badRequest(ProblemCode.VALIDATION_FAILED, "Tên nhóm hàng tối đa " + MAX_NAME + " ký tự.");
        }
        return name.strip();
    }

    private static Comparator<Category> order() {
        return Comparator.comparingInt(Category::getSortOrder).thenComparing(Category::getName);
    }

    private static AdminCategory toDto(Category c, long productCount, List<AdminCategory> children) {
        return new AdminCategory(c.getId(), c.getName(), c.getSlug(), c.getParentId(), c.getDescription(), c.isVisible(),
                c.getSortOrder(), productCount, children);
    }
}
