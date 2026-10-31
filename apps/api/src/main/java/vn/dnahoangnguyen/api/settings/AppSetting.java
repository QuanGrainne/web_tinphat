package vn.dnahoangnguyen.api.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "app_setting")
public class AppSetting {

    @Id
    @Column(name = "key", length = 80)
    private String key;

    // jsonb bound as text and cast in SQL, so no JSON format mapper is involved
    @Column(name = "value", nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "cast(? as jsonb)")
    private String valueJson;

    @Column(name = "updated_by")
    private String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AppSetting() {
    }

    public AppSetting(String key, String valueJson, String updatedBy) {
        this.key = key;
        this.valueJson = valueJson;
        this.updatedBy = updatedBy;
    }

    public String getKey() {
        return key;
    }

    public String getValueJson() {
        return valueJson;
    }

    public void update(String valueJson, String updatedBy) {
        this.valueJson = valueJson;
        this.updatedBy = updatedBy;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
