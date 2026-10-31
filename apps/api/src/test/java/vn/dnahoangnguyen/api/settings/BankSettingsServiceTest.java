package vn.dnahoangnguyen.api.settings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import vn.dnahoangnguyen.api.admin.audit.AuditService;
import vn.dnahoangnguyen.api.admin.auth.PasswordConfirmation;
import vn.dnahoangnguyen.api.admin.user.AppUser;
import vn.dnahoangnguyen.api.admin.user.AppUserDetails;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;
import vn.dnahoangnguyen.api.admin.user.Role;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.notify.NotificationPort;

class BankSettingsServiceTest {

    private final SettingsService settings = mock(SettingsService.class);
    private final AppUserRepository users = mock(AppUserRepository.class);
    private final PasswordConfirmation confirmation = mock(PasswordConfirmation.class);
    private final AuditService audit = mock(AuditService.class);
    private final NotificationPort notifications = mock(NotificationPort.class);
    private final BankSettingsService service =
            new BankSettingsService(settings, users, confirmation, audit, notifications);

    private final AppUser owner = new AppUser("owner", "{bcrypt}x", "Chủ", Role.MANAGER);
    private final BankInfo oldBank = new BankInfo("", "", "", "");
    private final BankSettingsUpdate request =
            new BankSettingsUpdate(" MB Bank ", "970422", "0123456789", "CONG TY DNA", "secret password");

    @BeforeEach
    void signIn() {
        AppUserDetails principal = new AppUserDetails(5, "owner", "Chủ", Role.MANAGER, null, true);
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities()));
        when(users.findById(5L)).thenReturn(Optional.of(owner));
        when(settings.bank()).thenReturn(oldBank);
    }

    @AfterEach
    void signOut() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void verifiesPasswordStoresTrimmedBankAuditsAndNotifiesWithMaskedAccount() {
        BankInfo result = service.update(request);

        BankInfo expected = new BankInfo("MB Bank", "970422", "0123456789", "CONG TY DNA");
        assertThat(result).isEqualTo(expected);
        verify(confirmation).verify(owner, "secret password");
        verify(settings).put(SettingsService.KEY_BANK, expected);
        verify(audit).record("SETTINGS_BANK", "SETTING", null, oldBank, expected);
        verify(notifications).bankSettingsChanged(eq("owner"), contains("***6789"));
    }

    @Test
    void wrongPasswordChangesNothing() {
        doThrow(DomainException.forbidden("Mật khẩu xác nhận không đúng.")).when(confirmation).verify(any(), any());

        assertThatThrownBy(() -> service.update(request)).isInstanceOf(DomainException.class);

        verify(settings, never()).put(any(), any());
        verify(audit, never()).record(any(), any(), any(), any(), any());
        verify(notifications, never()).bankSettingsChanged(any(), any());
    }

    @Test
    void aFailingNotificationDoesNotFailTheChange() {
        doThrow(new IllegalStateException("smtp down")).when(notifications).bankSettingsChanged(any(), any());

        BankInfo result = service.update(request);

        assertThat(result.accountNo()).isEqualTo("0123456789");
    }
}
