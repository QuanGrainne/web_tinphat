package vn.dnahoangnguyen.api.catalog.media;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.dnahoangnguyen.api.catalog.media.RemoteImageService.LocalizeReport;
import vn.dnahoangnguyen.api.catalog.product.ChangeActor;

/** Pictures still linked from another server (KiotViet), and the action that copies them onto this server. */
@RestController
@RequestMapping("/api/admin/images")
public class RemoteImageController {

    public record RemoteCount(int count) {
    }

    private final RemoteImageService service;

    public RemoteImageController(RemoteImageService service) {
        this.service = service;
    }

    @GetMapping("/remote")
    public RemoteCount remote() {
        return new RemoteCount(service.remoteCount());
    }

    @PostMapping("/localize")
    public LocalizeReport localize() {
        ChangeActor.current().requireManager("images", "Chỉ quản lý được tải ảnh về máy chủ.");
        return service.localizeStored();
    }
}
