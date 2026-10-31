package vn.dnahoangnguyen.api.settings;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import vn.dnahoangnguyen.api.admin.audit.AuditService;

class SettingsBootstrapRunnerTest {

    private final SettingsService settings = mock(SettingsService.class);
    private final AuditService audit = mock(AuditService.class);

    private SettingsBootstrapRunner runner(String name, String bin, String accountNo, String accountName) {
        return new SettingsBootstrapRunner(settings, audit, name, bin, accountNo, accountName);
    }

    @Test
    void storesTheBankWhenAllFourValuesAreSetAndNoneIsStored() {
        when(settings.bank()).thenReturn(new BankInfo("", "", "", ""));

        runner("MB Bank", "970422", "0123456789", "CONG TY DNA").run(new DefaultApplicationArguments());

        verify(settings).put(SettingsService.KEY_BANK, new BankInfo("MB Bank", "970422", "0123456789", "CONG TY DNA"));
    }

    @Test
    void doesNothingWhenAnyValueIsMissing() {
        runner("MB Bank", "970422", "", "CONG TY DNA").run(new DefaultApplicationArguments());

        verify(settings, never()).put(any(), any());
    }

    @Test
    void neverOverwritesAStoredAccount() {
        when(settings.bank()).thenReturn(new BankInfo("ACB", "970416", "111222333", "OWNER"));

        runner("MB Bank", "970422", "0123456789", "CONG TY DNA").run(new DefaultApplicationArguments());

        verify(settings, never()).put(any(), any());
    }
}
