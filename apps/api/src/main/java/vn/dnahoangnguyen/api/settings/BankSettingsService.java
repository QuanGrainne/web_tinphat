package vn.dnahoangnguyen.api.settings;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import vn.dnahoangnguyen.api.admin.audit.AuditService;
import vn.dnahoangnguyen.api.admin.auth.PasswordConfirmation;
import vn.dnahoangnguyen.api.admin.user.AppUser;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.security.CurrentUser;
import vn.dnahoangnguyen.api.notify.NotificationPort;

/** Changes the receiving bank account: MANAGER only, own password re-entered, audited, owner alerted after commit. */
@Service
public class BankSettingsService {

    private static final Logger log = LoggerFactory.getLogger(BankSettingsService.class);

    private final SettingsService settings;
    private final AppUserRepository users;
    private final PasswordConfirmation confirmation;
    private final AuditService audit;
    private final NotificationPort notifications;

    public BankSettingsService(SettingsService settings, AppUserRepository users, PasswordConfirmation confirmation,
                               AuditService audit, NotificationPort notifications) {
        this.settings = settings;
        this.users = users;
        this.confirmation = confirmation;
        this.audit = audit;
        this.notifications = notifications;
    }

    @PreAuthorize("hasRole('MANAGER')")
    @Transactional
    public BankInfo update(BankSettingsUpdate request) {
        CurrentUser actor = CurrentUser.current()
                .orElseThrow(() -> DomainException.forbidden("Bạn không có quyền thực hiện thao tác này."));
        AppUser user = users.findById(actor.id())
                .orElseThrow(() -> DomainException.forbidden("Bạn không có quyền thực hiện thao tác này."));
        confirmation.verify(user, request.currentPassword());

        BankInfo before = settings.bank();
        BankInfo after = new BankInfo(request.bankName().trim(), request.bin().trim(), request.accountNo().trim(),
                request.accountName().trim());
        settings.put(SettingsService.KEY_BANK, after);
        audit.record("SETTINGS_BANK", "SETTING", null, before, after);

        String summary = "Tài khoản nhận tiền đổi thành " + after.bankName() + " " + mask(after.accountNo())
                + " (" + after.accountName() + ")";
        afterCommit(() -> notifications.bankSettingsChanged(actor.username(), summary));
        return after;
    }

    private static String mask(String accountNo) {
        int keep = Math.min(4, accountNo.length());
        return "***" + accountNo.substring(accountNo.length() - keep);
    }

    /** A failing alert must not undo the change, so it runs after the commit and never throws. */
    private static void afterCommit(Runnable action) {
        Runnable safe = () -> {
            try {
                action.run();
            } catch (RuntimeException e) {
                log.error("Notification after bank settings change failed", e);
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    safe.run();
                }
            });
        } else {
            safe.run();
        }
    }
}
