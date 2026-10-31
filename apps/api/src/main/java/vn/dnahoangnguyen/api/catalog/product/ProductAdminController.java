package vn.dnahoangnguyen.api.catalog.product;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminProduct;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminProductList;
import vn.dnahoangnguyen.api.common.security.CurrentUser;

/** Admin product API. Editors may edit text fields only; publishing and lifecycle changes are manager-only. */
@RestController
@RequestMapping("/api/admin/products")
public class ProductAdminController {

    private final ProductService service;
    private final ProductAdminService reader;

    public ProductAdminController(ProductService service, ProductAdminService reader) {
        this.service = service;
        this.reader = reader;
    }

    @GetMapping
    public AdminProductList list(@RequestParam(name = "q", required = false) String q,
                                 @RequestParam(name = "categoryId", required = false) Long categoryId,
                                 @RequestParam(name = "brandId", required = false) Long brandId,
                                 @RequestParam(name = "published", required = false) Boolean published,
                                 @RequestParam(name = "needsAttention", required = false) Boolean needsAttention,
                                 @RequestParam(name = "page", defaultValue = "1") int page,
                                 @RequestParam(name = "size", defaultValue = "30") int size) {
        return reader.list(q, categoryId, brandId, published, needsAttention, page, size);
    }

    @GetMapping("/{id}")
    public AdminProduct get(@PathVariable("id") long id) {
        return reader.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminProduct create(@RequestBody AdminProduct body) {
        long id = service.saveAggregate(null, body, actor(), ChangeSource.MANUAL);
        return reader.get(id);
    }

    @PutMapping("/{id}")
    public AdminProduct update(@PathVariable("id") long id, @RequestBody AdminProduct body) {
        service.saveAggregate(id, body, actor(), ChangeSource.MANUAL);
        return reader.get(id);
    }

    @PostMapping("/{id}/publish")
    @PreAuthorize("hasRole('MANAGER')")
    public AdminProduct publish(@PathVariable("id") long id) {
        service.publish(id, actor());
        return reader.get(id);
    }

    @PostMapping("/{id}/unpublish")
    @PreAuthorize("hasRole('MANAGER')")
    public AdminProduct unpublish(@PathVariable("id") long id) {
        service.unpublish(id, actor());
        return reader.get(id);
    }

    @PostMapping("/{id}/discontinue")
    @PreAuthorize("hasRole('MANAGER')")
    public AdminProduct discontinue(@PathVariable("id") long id) {
        service.discontinue(id, actor());
        return reader.get(id);
    }

    @PostMapping("/{id}/reactivate")
    @PreAuthorize("hasRole('MANAGER')")
    public AdminProduct reactivate(@PathVariable("id") long id) {
        service.reactivate(id, actor());
        return reader.get(id);
    }

    private static ChangeActor actor() {
        return ChangeActor.of(CurrentUser.current()
                .orElseThrow(() -> new IllegalStateException("Admin endpoint reached without an authenticated user")));
    }
}
