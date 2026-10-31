package vn.dnahoangnguyen.api.sales;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import vn.dnahoangnguyen.api.common.config.AsyncSchedulingConfig;

/** Null-aware {@link ResultSet} reads shared by the sales repositories. */
public final class Rows {

    private Rows() {
    }

    public static Long longOrNull(ResultSet rs, String column) throws SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    /** Timestamp in the business time zone so JSON carries a {@code +07:00} offset. */
    public static OffsetDateTime time(ResultSet rs, String column) throws SQLException {
        OffsetDateTime value = rs.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.atZoneSameInstant(AsyncSchedulingConfig.BUSINESS_ZONE).toOffsetDateTime();
    }
}
