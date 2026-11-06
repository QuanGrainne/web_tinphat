package vn.dnahoangnguyen.api.catalog.media;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Image upload for the product and category forms; any signed-in admin may add images. */
@RestController
@RequestMapping("/api/admin/uploads")
public class ImageUploadController {

    public record UploadedImage(String url) {
    }

    private final ImageUploadService service;

    public ImageUploadController(ImageUploadService service) {
        this.service = service;
    }

    @PostMapping("/images")
    @ResponseStatus(HttpStatus.CREATED)
    public UploadedImage upload(@RequestParam("file") MultipartFile file) {
        return new UploadedImage(service.store(file));
    }
}
