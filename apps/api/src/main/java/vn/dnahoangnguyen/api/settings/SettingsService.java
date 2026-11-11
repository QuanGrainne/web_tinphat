package vn.dnahoangnguyen.api.settings;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import vn.dnahoangnguyen.api.common.security.CurrentUser;

/** Typed access to the {@code app_setting} key/value store (jsonb values). Missing or unreadable keys fall back to defaults. */
@Service
public class SettingsService {

    public static final String KEY_COMPANY = "company";
    public static final String KEY_BANK = "bank";
    public static final String KEY_MISMATCH_THRESHOLD = "pricing.mismatchThresholdPct";
    public static final String KEY_DISCOUNT_TIERS = "discount.tiers";
    public static final String KEY_OWNER_EMAIL = "notify.ownerEmail";
    public static final String KEY_TRUST_STRIP = "site.trustStrip";
    public static final String KEY_HOTLINE = "site.hotline";
    public static final String KEY_ZALO = "site.zalo";
    public static final String KEY_FACEBOOK = "site.facebook";

    public static final double DEFAULT_MISMATCH_THRESHOLD_PCT = 2.0;

    private static final Logger log = LoggerFactory.getLogger(SettingsService.class);

    private final AppSettingRepository repository;
    private final ObjectMapper mapper;

    public SettingsService(AppSettingRepository repository, ObjectMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public CompanyInfo company() {
        return get(KEY_COMPANY, CompanyInfo.class).orElse(new CompanyInfo("", "", "", "", "", ""));
    }

    @Transactional(readOnly = true)
    public BankInfo bank() {
        return get(KEY_BANK, BankInfo.class).orElse(new BankInfo("", "", "", ""));
    }

    @Transactional(readOnly = true)
    public double mismatchThresholdPct() {
        return get(KEY_MISMATCH_THRESHOLD, Double.class).orElse(DEFAULT_MISMATCH_THRESHOLD_PCT);
    }

    /** Ascending by threshold; an empty list means the discount ladder is off. */
    @Transactional(readOnly = true)
    public List<DiscountTier> discountTiers() {
        return read(KEY_DISCOUNT_TIERS, new TypeReference<List<DiscountTier>>() { })
                .orElse(List.of())
                .stream()
                .sorted(Comparator.comparingLong(DiscountTier::threshold))
                .toList();
    }

    @Transactional(readOnly = true)
    public String ownerEmail() {
        return get(KEY_OWNER_EMAIL, String.class).orElse("");
    }

    @Transactional(readOnly = true)
    public List<String> trustStrip() {
        return read(KEY_TRUST_STRIP, new TypeReference<List<String>>() { }).orElse(List.of());
    }

    @Transactional(readOnly = true)
    public String hotline() {
        return get(KEY_HOTLINE, String.class).orElse("");
    }

    @Transactional(readOnly = true)
    public Optional<String> zalo() {
        return get(KEY_ZALO, String.class).filter(s -> !s.isBlank());
    }

    /** Link to the Facebook page; empty when not configured. */
    @Transactional(readOnly = true)
    public Optional<String> facebook() {
        return get(KEY_FACEBOOK, String.class).filter(s -> !s.isBlank());
    }

    @Transactional(readOnly = true)
    public <T> Optional<T> get(String key, Class<T> type) {
        return repository.findById(key).flatMap(row -> parse(key, row.getValueJson(), type));
    }

    @Transactional
    public void put(String key, Object value) {
        String json = mapper.writeValueAsString(value);
        String updatedBy = CurrentUser.current().map(CurrentUser::username).orElse("system");
        repository.findById(key).ifPresentOrElse(
                row -> row.update(json, updatedBy),
                () -> repository.save(new AppSetting(key, json, updatedBy)));
    }

    private <T> Optional<T> read(String key, TypeReference<T> type) {
        return repository.findById(key).flatMap(row -> {
            try {
                return Optional.ofNullable(mapper.readValue(row.getValueJson(), type));
            } catch (RuntimeException e) {
                log.error("Setting '{}' is not readable, using default", key, e);
                return Optional.empty();
            }
        });
    }

    private <T> Optional<T> parse(String key, String json, Class<T> type) {
        try {
            return Optional.ofNullable(mapper.readValue(json, type));
        } catch (RuntimeException e) {
            log.error("Setting '{}' is not readable as {}, using default", key, type.getSimpleName(), e);
            return Optional.empty();
        }
    }
}
