package vn.dnahoangnguyen.api.settings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.json.JsonMapper;

class SettingsServiceTest {

    private final AppSettingRepository repository = mock(AppSettingRepository.class);
    private final SettingsService service = new SettingsService(repository, JsonMapper.builder().build());

    private void stored(String key, String json) {
        when(repository.findById(key)).thenReturn(Optional.of(new AppSetting(key, json, "test")));
    }

    @Test
    void missingKeysFallBackToDefaults() {
        when(repository.findById(any())).thenReturn(Optional.empty());

        assertThat(service.mismatchThresholdPct()).isEqualTo(2.0);
        assertThat(service.discountTiers()).isEmpty();
        assertThat(service.trustStrip()).isEmpty();
        assertThat(service.zalo()).isEmpty();
        assertThat(service.bank().accountNo()).isEmpty();
        assertThat(service.ownerEmail()).isEmpty();
    }

    @Test
    void readsTypedValues() {
        stored("pricing.mismatchThresholdPct", "3.5");
        stored("notify.ownerEmail", "\"owner@example.com\"");
        stored("site.zalo", "\"0366985679\"");
        stored("bank", "{\"bankName\":\"MB\",\"bin\":\"970422\",\"accountNo\":\"123\",\"accountName\":\"DNA\"}");

        assertThat(service.mismatchThresholdPct()).isEqualTo(3.5);
        assertThat(service.ownerEmail()).isEqualTo("owner@example.com");
        assertThat(service.zalo()).contains("0366985679");
        assertThat(service.bank()).isEqualTo(new BankInfo("MB", "970422", "123", "DNA"));
    }

    @Test
    void blankZaloMeansAbsent() {
        stored("site.zalo", "\"  \"");
        assertThat(service.zalo()).isEmpty();
    }

    @Test
    void discountTiersAreSortedAscending() {
        stored("discount.tiers", "[{\"threshold\":5000000,\"pct\":2.0},{\"threshold\":1000000,\"pct\":1.0}]");
        assertThat(service.discountTiers())
                .containsExactly(new DiscountTier(1_000_000, 1.0), new DiscountTier(5_000_000, 2.0));
    }

    @Test
    void unreadableValueFallsBackToDefault() {
        stored("pricing.mismatchThresholdPct", "\"not a number\"");
        assertThat(service.mismatchThresholdPct()).isEqualTo(2.0);
    }

    @Test
    void putCreatesMissingRowWithSystemAsUpdater() {
        when(repository.findById("site.hotline")).thenReturn(Optional.empty());

        service.put("site.hotline", "0900 000 000");

        ArgumentCaptor<AppSetting> captor = ArgumentCaptor.forClass(AppSetting.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getKey()).isEqualTo("site.hotline");
        assertThat(captor.getValue().getValueJson()).isEqualTo("\"0900 000 000\"");
        assertThat(captor.getValue().getUpdatedBy()).isEqualTo("system");
    }

    @Test
    void putUpdatesExistingRowInPlace() {
        AppSetting row = new AppSetting("site.hotline", "\"old\"", "x");
        when(repository.findById("site.hotline")).thenReturn(Optional.of(row));

        service.put("site.hotline", "new");

        assertThat(row.getValueJson()).isEqualTo("\"new\"");
        verify(repository, never()).save(any());
    }
}
