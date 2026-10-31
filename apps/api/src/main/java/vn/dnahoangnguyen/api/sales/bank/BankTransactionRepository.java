package vn.dnahoangnguyen.api.sales.bank;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import vn.dnahoangnguyen.api.sales.Rows;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.BankTransactionRow;

/** JDBC access to {@code bank_transaction}. Callers own the transaction. */
@Repository
public class BankTransactionRepository {

    /** One stored notification; {@code orderId}/{@code orderCode} are set when it points at an order. */
    public record BankTx(
            long id, String accountNo, String direction, long amount, String content, OffsetDateTime txTime,
            String status, String reviewReason, Long orderId, String orderCode, String decisionNote) {

        public boolean incoming() {
            return "IN".equals(direction);
        }
    }

    public record NewBankTx(
            String vendorTxId, String referenceCode, String gateway, String accountNo, String direction, long amount,
            String content, String vendorCode, OffsetDateTime txTime, String rawJson) {
    }

    private static final String SELECT = """
            select b.*, o.code as order_code
            from bank_transaction b left join customer_order o on o.id = b.order_id
            """;

    private static final RowMapper<BankTx> TX = (rs, n) -> new BankTx(
            rs.getLong("id"), rs.getString("account_no"), rs.getString("direction"), rs.getLong("amount"),
            rs.getString("content"), Rows.time(rs, "tx_time"), rs.getString("status"), rs.getString("review_reason"),
            Rows.longOrNull(rs, "order_id"), rs.getString("order_code"), rs.getString("decision_note"));

    private final JdbcClient jdbc;

    public BankTransactionRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Inserts a RECEIVED row; empty when the vendor transaction id is already stored (a replay). */
    public Optional<Long> insertIfAbsent(NewBankTx tx) {
        return jdbc.sql("""
                insert into bank_transaction (vendor, vendor_tx_id, reference_code, gateway, account_no, direction,
                    amount, content, vendor_code, tx_time, raw, source, status)
                values ('SEPAY', :vendorTxId, :referenceCode, :gateway, :accountNo, :direction,
                    :amount, :content, :vendorCode, :txTime, cast(:raw as jsonb), 'WEBHOOK', 'RECEIVED')
                on conflict (vendor, vendor_tx_id) do nothing
                returning id
                """)
                .param("vendorTxId", tx.vendorTxId()).param("referenceCode", tx.referenceCode())
                .param("gateway", tx.gateway()).param("accountNo", tx.accountNo()).param("direction", tx.direction())
                .param("amount", tx.amount()).param("content", tx.content()).param("vendorCode", tx.vendorCode())
                .param("txTime", tx.txTime()).param("raw", tx.rawJson())
                .query(Long.class).optional();
    }

    public Optional<BankTx> findById(long id) {
        return jdbc.sql(SELECT + " where b.id = :id").param("id", id).query(TX).optional();
    }

    /** Row lock; the join is left out because {@code for update} cannot lock the nullable side of an outer join. */
    public Optional<BankTx> lockById(long id) {
        return jdbc.sql("select b.*, null::varchar as order_code from bank_transaction b where b.id = :id for update")
                .param("id", id).query(TX).optional();
    }

    public List<BankTx> list(String status, int limit, int offset) {
        String where = status == null ? "" : " where b.status = :status";
        JdbcClient.StatementSpec spec = jdbc.sql(SELECT + where + " order by b.created_at desc, b.id desc limit :limit offset :offset")
                .param("limit", limit).param("offset", offset);
        if (status != null) {
            spec = spec.param("status", status);
        }
        return spec.query(TX).list();
    }

    public long count(String status) {
        if (status == null) {
            return jdbc.sql("select count(*) from bank_transaction").query(Long.class).single();
        }
        return jdbc.sql("select count(*) from bank_transaction where status = :status").param("status", status)
                .query(Long.class).single();
    }

    public List<BankTx> forOrder(long orderId) {
        return jdbc.sql(SELECT + " where b.order_id = :id order by b.tx_time desc, b.id desc")
                .param("id", orderId).query(TX).list();
    }

    /** Sum of incoming transfers a person linked to the order. */
    public long sumLinkedIncoming(long orderId) {
        return jdbc.sql("select coalesce(sum(amount), 0) from bank_transaction where order_id = :id and status = 'MATCHED' and direction = 'IN'")
                .param("id", orderId).query(Long.class).single();
    }

    public void markMatched(long id, long orderId, String decidedBy, String note) {
        jdbc.sql("""
                update bank_transaction set status = 'MATCHED', review_reason = null, order_id = :orderId,
                    decided_by = :by, decided_at = now(), decision_note = :note, version = version + 1
                where id = :id
                """)
                .param("orderId", orderId).param("by", decidedBy).param("note", note).param("id", id).update();
    }

    /** Automatic match: no person decided, the webhook did. */
    public void markAutoMatched(long id, long orderId) {
        jdbc.sql("update bank_transaction set status = 'MATCHED', order_id = :orderId, version = version + 1 where id = :id")
                .param("orderId", orderId).param("id", id).update();
    }

    public void markReview(long id, String reason, Long suggestedOrderId) {
        jdbc.sql("update bank_transaction set status = 'REVIEW', review_reason = :reason, order_id = :orderId, version = version + 1 where id = :id")
                .param("reason", reason).param("orderId", suggestedOrderId).param("id", id).update();
    }

    public void markIgnored(long id, String decidedBy, String note) {
        jdbc.sql("""
                update bank_transaction set status = 'IGNORED', decided_by = :by, decided_at = now(),
                    decision_note = :note, version = version + 1
                where id = :id
                """)
                .param("by", decidedBy).param("note", note).param("id", id).update();
    }

    public static BankTransactionRow toRow(BankTx tx) {
        return new BankTransactionRow(tx.id(), tx.txTime(), tx.amount(), tx.direction(), maskAccount(tx.accountNo()),
                tx.content() == null ? "" : tx.content(), tx.status(), tx.reviewReason(), tx.orderCode(),
                tx.decisionNote());
    }

    /** Only the last four characters survive: {@code ****6789}. */
    public static String maskAccount(String accountNo) {
        if (accountNo == null || accountNo.isBlank()) {
            return "";
        }
        String trimmed = accountNo.strip();
        return "****" + trimmed.substring(Math.max(0, trimmed.length() - 4));
    }
}
