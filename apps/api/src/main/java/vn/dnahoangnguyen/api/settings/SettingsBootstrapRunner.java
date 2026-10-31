package vn.dnahoangnguyen.api.settings;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.dnahoangnguyen.api.admin.audit.AuditActor;
import vn.dnahoangnguyen.api.admin.audit.AuditService;

/**
 * Seeds the receiving bank account from {@code DNA_BANK_NAME / DNA_BANK_BIN / DNA_BANK_ACCOUNT_NO /
 * DNA_BANK_ACCOUNT_NAME} when all four are set and no account number is stored yet. After that the owner manages
 * the account in the admin screen and the environment values are ignored.
 */
@Component
public class SettingsBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SettingsBootstrapRunner.class);

    private final SettingsService settings;
    private final AuditService audit;
    private final BankInfo fromEnvironment;

    public SettingsBootstrapRunner(SettingsService settings, AuditService audit,
                                   @Value("${dna.bootstrap.bank.name:}") String bankName,
                                   @Value("${dna.bootstrap.bank.bin:}") String bin,
                                   @Value("${dna.bootstrap.bank.account-no:}") String accountNo,
                                   @Value("${dna.bootstrap.bank.account-name:}") String accountName) {
        this.settings = settings;
        this.audit = audit;
        this.fromEnvironment = new BankInfo(trim(bankName), trim(bin), trim(accountNo), trim(accountName));
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (fromEnvironment.bankName().isEmpty() || fromEnvironment.bin().isEmpty()
                || fromEnvironment.accountNo().isEmpty() || fromEnvironment.accountName().isEmpty()) {
            return;
        }
        BankInfo current = settings.bank();
        if (!current.accountNo().isBlank()) {
            return;
        }
        settings.put(SettingsService.KEY_BANK, fromEnvironment);
        audit.recordAs(AuditActor.system("BOOTSTRAP"), "SETTINGS_BANK", "SETTING", null, current, fromEnvironment);
        log.info("Bank account stored from the environment: {} (BIN {})", fromEnvironment.bankName(),
                fromEnvironment.bin());
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
