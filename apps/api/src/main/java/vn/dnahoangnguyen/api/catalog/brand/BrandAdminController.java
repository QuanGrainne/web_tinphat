package vn.dnahoangnguyen.api.catalog.brand;

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
import vn.dnahoangnguyen.api.catalog.brand.BrandService.AdminBrand;
import vn.dnahoangnguyen.api.catalog.brand.BrandService.BrandCreate;
import vn.dnahoangnguyen.api.catalog.brand.BrandService.BrandUpdate;

@RestController
@RequestMapping("/api/admin/brands")
public class BrandAdminController {

    private final BrandService service;

    public BrandAdminController(BrandService service) {
        this.service = service;
    }

    @GetMapping
    public List<AdminBrand> list() {
        return service.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminBrand create(@RequestBody BrandCreate body) {
        return service.create(body);
    }

    @PutMapping("/{id}")
    public AdminBrand update(@PathVariable("id") long id, @RequestBody BrandUpdate body) {
        return service.update(id, body);
    }
}
