package vn.dnahoangnguyen.api.catalog.category;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.dnahoangnguyen.api.catalog.category.CategoryService.AdminCategory;
import vn.dnahoangnguyen.api.catalog.category.CategoryService.CategoryCreate;
import vn.dnahoangnguyen.api.catalog.category.CategoryService.CategoryUpdate;
import vn.dnahoangnguyen.api.catalog.product.ChangeActor;

@RestController
@RequestMapping("/api/admin/categories")
public class CategoryAdminController {

    private final CategoryService service;

    public CategoryAdminController(CategoryService service) {
        this.service = service;
    }

    @GetMapping
    public List<AdminCategory> tree() {
        return service.tree();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminCategory create(@RequestBody CategoryCreate body) {
        return service.create(body);
    }

    @PutMapping("/{id}")
    public AdminCategory update(@PathVariable("id") long id, @RequestBody CategoryUpdate body) {
        return service.update(id, body, ChangeActor.current());
    }
}
