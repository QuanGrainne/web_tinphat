package vn.dnahoangnguyen.api.settings;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SettingsController {

    private final SettingsService settings;
    private final BankSettingsService bankSettings;
    private final ContactSettingsService contactSettings;

    public SettingsController(SettingsService settings, BankSettingsService bankSettings, ContactSettingsService contactSettings) {
        this.settings = settings;
        this.bankSettings = bankSettings;
        this.contactSettings = contactSettings;
    }

    @GetMapping("/api/public/settings")
    public PublicSettings publicSettings() {
        return new PublicSettings(settings.company(), settings.hotline(), settings.zalo().orElse(null),
                settings.facebook().orElse(null), settings.trustStrip());
    }

    @GetMapping("/api/admin/settings")
    @PreAuthorize("hasRole('MANAGER')")
    public AdminSettings adminSettings() {
        return new AdminSettings(settings.company(), settings.bank(), settings.ownerEmail(),
                settings.mismatchThresholdPct(), settings.discountTiers());
    }

    @GetMapping("/api/admin/settings/contact")
    @PreAuthorize("hasRole('MANAGER')")
    public ContactSettings contact() {
        return contactSettings.current();
    }

    @PutMapping("/api/admin/settings/contact")
    @PreAuthorize("hasRole('MANAGER')")
    public ContactSettings updateContact(@Valid @RequestBody ContactSettings body) {
        return contactSettings.update(body);
    }

    @PutMapping("/api/admin/settings/bank")
    @PreAuthorize("hasRole('MANAGER')")
    public BankInfo updateBank(@Valid @RequestBody BankSettingsUpdate body) {
        return bankSettings.update(body);
    }
}
