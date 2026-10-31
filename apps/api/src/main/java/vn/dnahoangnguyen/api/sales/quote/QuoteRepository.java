package vn.dnahoangnguyen.api.sales.quote;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import vn.dnahoangnguyen.api.sales.Rows;

/** JDBC access to {@code quote_request} and {@code quote_item}. Callers own the transaction. */
@Repository
public class QuoteRepository {

    public record QuoteRow(
            long id, String code, String customerName, String phone, String phoneNorm, String email, String company,
            String taxCode, String note, QuoteStatus status, String internalNote, long subtotal,
            boolean hasContactLines, OffsetDateTime createdAt) {
    }

    /** {@code unitPrice} and {@code lineTotal} are null for lines whose price is hidden. */
    public record ItemRow(
            long skuId, String skuCode, String productName, String productSlug, String unitName, int conversion,
            int qty, Long unitPrice, Long lineTotal) {
    }

    public record NewQuote(
            String code, UUID submissionId, String customerName, String phone, String phoneNorm, String email,
            String company, String taxCode, String note, long subtotal, boolean hasContactLines, String clientIp) {
    }

    private static final String SELECT = "select * from quote_request";

    private static final RowMapper<QuoteRow> QUOTE = (rs, n) -> new QuoteRow(
            rs.getLong("id"), rs.getString("code"), rs.getString("customer_name"), rs.getString("phone"),
            rs.getString("phone_norm"), rs.getString("email"), rs.getString("company"), rs.getString("tax_code"),
            rs.getString("note"), QuoteStatus.valueOf(rs.getString("status")), rs.getString("internal_note"),
            rs.getLong("subtotal"), rs.getBoolean("has_contact_lines"), Rows.time(rs, "created_at"));

    private static final RowMapper<ItemRow> ITEM = (rs, n) -> new ItemRow(
            rs.getLong("sku_id"), rs.getString("sku_code"), rs.getString("product_name"),
            rs.getString("product_slug"), rs.getString("unit_name"), rs.getInt("conversion"), rs.getInt("qty"),
            Rows.longOrNull(rs, "unit_price"), Rows.longOrNull(rs, "line_total"));

    private final JdbcClient jdbc;

    public QuoteRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<QuoteRow> findBySubmissionId(UUID submissionId) {
        return jdbc.sql(SELECT + " where submission_id = :id").param("id", submissionId).query(QUOTE).optional();
    }

    public Optional<QuoteRow> findById(long id) {
        return jdbc.sql(SELECT + " where id = :id").param("id", id).query(QUOTE).optional();
    }

    public Optional<QuoteRow> lockById(long id) {
        return jdbc.sql(SELECT + " where id = :id for update").param("id", id).query(QUOTE).optional();
    }

    public boolean codeExists(String code) {
        return jdbc.sql("select count(*) from quote_request where code = :code").param("code", code)
                .query(Long.class).single() > 0;
    }

    public long insert(NewQuote quote) {
        return jdbc.sql("""
                insert into quote_request (code, submission_id, customer_name, phone, phone_norm, email, company,
                    tax_code, note, status, subtotal, has_contact_lines, client_ip)
                values (:code, :submissionId, :customerName, :phone, :phoneNorm, :email, :company,
                    :taxCode, :note, 'NEW', :subtotal, :hasContactLines, :clientIp)
                returning id
                """)
                .param("code", quote.code()).param("submissionId", quote.submissionId())
                .param("customerName", quote.customerName()).param("phone", quote.phone())
                .param("phoneNorm", quote.phoneNorm()).param("email", quote.email())
                .param("company", quote.company()).param("taxCode", quote.taxCode()).param("note", quote.note())
                .param("subtotal", quote.subtotal()).param("hasContactLines", quote.hasContactLines())
                .param("clientIp", quote.clientIp())
                .query(Long.class).single();
    }

    public void insertItem(long quoteId, long skuId, String skuCode, String productName, String unitName,
                           int conversion, int qty, Long unitPrice, Long lineTotal) {
        jdbc.sql("""
                insert into quote_item (quote_id, sku_id, sku_code, product_name, unit_name, conversion, qty,
                    unit_price, line_total)
                values (:quoteId, :skuId, :skuCode, :productName, :unitName, :conversion, :qty, :unitPrice, :lineTotal)
                """)
                .param("quoteId", quoteId).param("skuId", skuId).param("skuCode", skuCode)
                .param("productName", productName).param("unitName", unitName).param("conversion", conversion)
                .param("qty", qty).param("unitPrice", unitPrice).param("lineTotal", lineTotal)
                .update();
    }

    /** Items with the product's current slug (not stored on the item). */
    public List<ItemRow> items(long quoteId) {
        return jdbc.sql("""
                select qi.*, coalesce(p.slug, '') as product_slug
                from quote_item qi
                left join sku s on s.id = qi.sku_id
                left join product p on p.id = s.product_id
                where qi.quote_id = :id order by qi.id
                """).param("id", quoteId).query(ITEM).list();
    }

    public void updateStatus(long id, QuoteStatus status) {
        jdbc.sql("update quote_request set status = :status, updated_at = now(), version = version + 1 where id = :id")
                .param("status", status.name()).param("id", id).update();
    }

    public int updateInternalNote(long id, String note) {
        return jdbc.sql("update quote_request set internal_note = :note, updated_at = now(), version = version + 1 where id = :id")
                .param("note", note).param("id", id).update();
    }
}
