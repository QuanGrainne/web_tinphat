package vn.dnahoangnguyen.api.sales.bank;

import jakarta.validation.Valid;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.dnahoangnguyen.api.common.security.CurrentUser;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.BankTransactionRow;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.DismissRequest;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.LinkRequest;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.PageOf;

/** Bank review queue. Managers only: it decides whether money was received. */
@RestController
@RequestMapping("/api/admin/bank-transactions")
@PreAuthorize("hasRole('MANAGER')")
public class BankTransactionAdminController {

    private final BankTransactionAdminService service;

    public BankTransactionAdminController(BankTransactionAdminService service) {
        this.service = service;
    }

    @GetMapping
    public PageOf<BankTransactionRow> list(@RequestParam(required = false) String status,
                                           @RequestParam(defaultValue = "1") int page,
                                           @RequestParam(defaultValue = "30") int size) {
        return service.list(status, page, size);
    }

    @PostMapping("/{id}/link")
    public BankTransactionRow link(@PathVariable long id, @Valid @RequestBody LinkRequest body) {
        return service.link(id, body, user());
    }

    @PostMapping("/{id}/dismiss")
    public BankTransactionRow dismiss(@PathVariable long id, @Valid @RequestBody DismissRequest body) {
        return service.dismiss(id, body, user());
    }

    private static CurrentUser user() {
        return CurrentUser.current().orElseThrow(() -> new AccessDeniedException("Not signed in"));
    }
}
