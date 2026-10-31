package vn.dnahoangnguyen.api.admin.user;

import java.util.Map;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.dnahoangnguyen.api.admin.audit.AuditActor;
import vn.dnahoangnguyen.api.admin.audit.AuditService;
import vn.dnahoangnguyen.api.admin.auth.PasswordService;

/**
 * Creates the first MANAGER from {@code DNA_BOOTSTRAP_MANAGER_USERNAME} / {@code DNA_BOOTSTRAP_MANAGER_PASSWORD}
 * when the user table is empty. Later changes to the accounts are made in the database, never here.
 */
@Component
public class BootstrapManagerRunner implements ApplicationRunner {

    static final int MIN_PASSWORD_LENGTH = 12;
    private static final Pattern USERNAME = Pattern.compile("[A-Za-z0-9._@-]{3,80}");
    private static final Logger log = LoggerFactory.getLogger(BootstrapManagerRunner.class);

    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final AuditService audit;
    private final String username;
    private final String password;
    private final String displayName;

    public BootstrapManagerRunner(AppUserRepository users, PasswordEncoder encoder, AuditService audit,
                                  @Value("${dna.bootstrap.manager.username:}") String username,
                                  @Value("${dna.bootstrap.manager.password:}") String password,
                                  @Value("${dna.bootstrap.manager.display-name:Quản lý}") String displayName) {
        this.users = users;
        this.encoder = encoder;
        this.audit = audit;
        this.username = username == null ? "" : username.trim();
        this.password = password == null ? "" : password;
        this.displayName = displayName;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.count() > 0) {
            return;
        }
        if (username.isEmpty() && password.isEmpty()) {
            log.warn("No admin account exists and DNA_BOOTSTRAP_MANAGER_USERNAME / DNA_BOOTSTRAP_MANAGER_PASSWORD are "
                    + "not set; nobody can sign in to /admin");
            return;
        }
        if (!USERNAME.matcher(username).matches()) {
            log.error("DNA_BOOTSTRAP_MANAGER_USERNAME must be 3-80 characters of letters, digits and . _ @ -; "
                    + "no account created");
            return;
        }
        if (password.length() < MIN_PASSWORD_LENGTH) {
            log.error("DNA_BOOTSTRAP_MANAGER_PASSWORD must have at least {} characters; no account created",
                    MIN_PASSWORD_LENGTH);
            return;
        }
        if (!PasswordService.fitsBcrypt(password)) {
            log.error("DNA_BOOTSTRAP_MANAGER_PASSWORD must be at most {} bytes in UTF-8 (the bcrypt limit); "
                    + "no account created", PasswordService.MAX_PASSWORD_BYTES);
            return;
        }
        AppUser manager = users.save(new AppUser(username, encoder.encode(password), displayName, Role.MANAGER));
        audit.recordAs(AuditActor.system("BOOTSTRAP"), "USER_BOOTSTRAP", "USER", manager.getId(), null,
                Map.of("username", manager.getUsername(), "role", Role.MANAGER.name()));
        log.info("Created the first MANAGER account '{}'", manager.getUsername());
    }
}
