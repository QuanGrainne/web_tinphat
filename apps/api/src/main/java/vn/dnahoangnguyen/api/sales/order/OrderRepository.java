package vn.dnahoangnguyen.api.sales.order;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import vn.dnahoangnguyen.api.sales.Rows;

/** JDBC access to {@code customer_order} and {@code order_item}. Callers own the transaction. */
@Repository
public class OrderRepository {

    public record OrderRow(
            long id, String code, String customerName, String phone, String phoneNorm, String address, String note,
            PaymentMethod paymentMethod, OrderStatus status, String kiotvietOrderCode,
            long subtotal, long discountTotal, String discountNote, Long shippingFee, long total,
            Long paidAmount, String paidNote, String paidBy, String paidVia, OffsetDateTime paidAt,
            String internalNote, OffsetDateTime createdAt) {
    }

    public record ItemRow(
            long skuId, String skuCode, String productName, String unitName, int conversion, int qty,
            long listPrice, long unitPrice, long lineTotal) {
    }

    public record NewOrder(
            String code, UUID submissionId, String customerName, String phone, String phoneNorm, String address,
            String note, PaymentMethod paymentMethod, long subtotal, long discountTotal, String discountNote,
            long total, String clientIp) {
    }

    private static final String SELECT = "select * from customer_order";

    private static final RowMapper<OrderRow> ORDER = (rs, n) -> new OrderRow(
            rs.getLong("id"), rs.getString("code"), rs.getString("customer_name"), rs.getString("phone"),
            rs.getString("phone_norm"), rs.getString("address"), rs.getString("note"),
            PaymentMethod.valueOf(rs.getString("payment_method")), OrderStatus.valueOf(rs.getString("status")),
            rs.getString("kiotviet_order_code"), rs.getLong("subtotal"), rs.getLong("discount_total"),
            rs.getString("discount_note"), Rows.longOrNull(rs, "shipping_fee"), rs.getLong("total"),
            Rows.longOrNull(rs, "paid_amount"), rs.getString("paid_note"), rs.getString("paid_by"),
            rs.getString("paid_via"), Rows.time(rs, "paid_at"), rs.getString("internal_note"),
            Rows.time(rs, "created_at"));

    private static final RowMapper<ItemRow> ITEM = (rs, n) -> new ItemRow(
            rs.getLong("sku_id"), rs.getString("sku_code"), rs.getString("product_name"), rs.getString("unit_name"),
            rs.getInt("conversion"), rs.getInt("qty"), rs.getLong("list_price"), rs.getLong("unit_price"),
            rs.getLong("line_total"));

    private final JdbcClient jdbc;

    public OrderRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<OrderRow> findBySubmissionId(UUID submissionId) {
        return jdbc.sql(SELECT + " where submission_id = :id").param("id", submissionId).query(ORDER).optional();
    }

    public Optional<OrderRow> findByCodeAndPhone(String code, String phoneNorm) {
        return jdbc.sql(SELECT + " where code = :code and phone_norm = :phone")
                .param("code", code).param("phone", phoneNorm).query(ORDER).optional();
    }

    public Optional<OrderRow> findById(long id) {
        return jdbc.sql(SELECT + " where id = :id").param("id", id).query(ORDER).optional();
    }

    /** Row lock for the rest of the transaction; serialises transitions and bank matching on one order. */
    public Optional<OrderRow> lockById(long id) {
        return jdbc.sql(SELECT + " where id = :id for update").param("id", id).query(ORDER).optional();
    }

    public Optional<OrderRow> lockByCode(String code) {
        return jdbc.sql(SELECT + " where code = :code for update").param("code", code).query(ORDER).optional();
    }

    public boolean codeExists(String code) {
        return jdbc.sql("select count(*) from customer_order where code = :code").param("code", code)
                .query(Long.class).single() > 0;
    }

    public long insert(NewOrder order) {
        return jdbc.sql("""
                insert into customer_order (code, submission_id, customer_name, phone, phone_norm, address, note,
                    payment_method, status, subtotal, discount_total, discount_note, total, client_ip)
                values (:code, :submissionId, :customerName, :phone, :phoneNorm, :address, :note,
                    :paymentMethod, 'PENDING', :subtotal, :discountTotal, :discountNote, :total, :clientIp)
                returning id
                """)
                .param("code", order.code()).param("submissionId", order.submissionId())
                .param("customerName", order.customerName()).param("phone", order.phone())
                .param("phoneNorm", order.phoneNorm()).param("address", order.address())
                .param("note", order.note()).param("paymentMethod", order.paymentMethod().name())
                .param("subtotal", order.subtotal()).param("discountTotal", order.discountTotal())
                .param("discountNote", order.discountNote()).param("total", order.total())
                .param("clientIp", order.clientIp())
                .query(Long.class).single();
    }

    public void insertItem(long orderId, ItemRow item) {
        jdbc.sql("""
                insert into order_item (order_id, sku_id, sku_code, product_name, unit_name, conversion, qty,
                    list_price, unit_price, line_total)
                values (:orderId, :skuId, :skuCode, :productName, :unitName, :conversion, :qty,
                    :listPrice, :unitPrice, :lineTotal)
                """)
                .param("orderId", orderId).param("skuId", item.skuId()).param("skuCode", item.skuCode())
                .param("productName", item.productName()).param("unitName", item.unitName())
                .param("conversion", item.conversion()).param("qty", item.qty())
                .param("listPrice", item.listPrice()).param("unitPrice", item.unitPrice())
                .param("lineTotal", item.lineTotal())
                .update();
    }

    public List<ItemRow> items(long orderId) {
        return jdbc.sql("select * from order_item where order_id = :id order by id").param("id", orderId)
                .query(ITEM).list();
    }

    /** Writes the fields a transition can change; the caller passes the full new values. */
    public void updateAfterTransition(long id, OrderStatus status, Long shippingFee, long total, Long paidAmount,
                                      String paidNote, String paidBy, String paidVia, OffsetDateTime paidAt,
                                      String kiotvietOrderCode) {
        jdbc.sql("""
                update customer_order set status = :status, shipping_fee = :fee, total = :total,
                    paid_amount = :paidAmount, paid_note = :paidNote, paid_by = :paidBy, paid_via = :paidVia,
                    paid_at = :paidAt, kiotviet_order_code = :kiotviet, updated_at = now(), version = version + 1
                where id = :id
                """)
                .param("status", status.name()).param("fee", shippingFee).param("total", total)
                .param("paidAmount", paidAmount).param("paidNote", paidNote).param("paidBy", paidBy)
                .param("paidVia", paidVia).param("paidAt", paidAt).param("kiotviet", kiotvietOrderCode)
                .param("id", id)
                .update();
    }

    public int updateInternalNote(long id, String note) {
        return jdbc.sql("update customer_order set internal_note = :note, updated_at = now(), version = version + 1 where id = :id")
                .param("note", note).param("id", id).update();
    }
}
