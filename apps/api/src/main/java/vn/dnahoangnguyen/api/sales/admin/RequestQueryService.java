package vn.dnahoangnguyen.api.sales.admin;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.sales.Rows;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.RequestCounters;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.RequestList;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.RequestRow;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.Totals;
import vn.dnahoangnguyen.api.sales.order.PaymentMethod;

/** The unified quote and order queue plus the numbers behind the admin bell. */
@Service
public class RequestQueryService {

    public static final int MAX_PAGE_SIZE = 100;

    private static final String UNION = """
            with r as (
              select 'ORDER' as kind, o.id, o.code, o.customer_name, o.phone, o.phone_norm, o.created_at,
                     (select count(*) from order_item i where i.order_id = o.id) as item_count,
                     o.total as total, o.payment_method, o.status, u.display_name as assignee_name
              from customer_order o left join app_user u on u.id = o.assignee_id
              union all
              select 'QUOTE', q.id, q.code, q.customer_name, q.phone, q.phone_norm, q.created_at,
                     (select count(*) from quote_item i where i.quote_id = q.id),
                     case when q.subtotal > 0 then q.subtotal else null end, null, q.status, u.display_name
              from quote_request q left join app_user u on u.id = q.assignee_id
            )
            """;

    private final JdbcClient jdbc;

    public RequestQueryService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Newest first. Filters are optional; {@code awaitingKiotViet} keeps only orders that wait for KiotViet entry
     * (COD confirmed or bank transfer paid).
     */
    @Transactional(readOnly = true)
    public RequestList list(String kind, String status, String payment, String q, Boolean awaitingKiotViet,
                            int page, int size) {
        int safePage = Math.max(1, page);
        int safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, size));
        StringBuilder where = new StringBuilder(" where 1 = 1");
        Map<String, Object> params = new HashMap<>();
        if (notBlank(kind)) {
            String k = kind.strip().toUpperCase(Locale.ROOT);
            if (!k.equals("ORDER") && !k.equals("QUOTE")) {
                throw DomainException.badRequest(vn.dnahoangnguyen.api.common.error.ProblemCode.VALIDATION_FAILED,
                        "Loại yêu cầu không hợp lệ.");
            }
            where.append(" and r.kind = :kind");
            params.put("kind", k);
        }
        if (notBlank(status)) {
            where.append(" and r.status = :status");
            params.put("status", status.strip().toUpperCase(Locale.ROOT));
        }
        if (notBlank(payment)) {
            try {
                params.put("payment", PaymentMethod.valueOf(payment.strip().toUpperCase(Locale.ROOT)).name());
            } catch (IllegalArgumentException e) {
                throw DomainException.badRequest(vn.dnahoangnguyen.api.common.error.ProblemCode.VALIDATION_FAILED,
                        "Hình thức thanh toán không hợp lệ.");
            }
            where.append(" and r.payment_method = :payment");
        }
        if (Boolean.TRUE.equals(awaitingKiotViet)) {
            // same predicate as OrderStatusMachine.awaitsKiotVietEntry
            where.append(" and r.kind = 'ORDER' and ((r.payment_method = 'COD' and r.status = 'CONFIRMED')"
                    + " or (r.payment_method = 'BANK_TRANSFER' and r.status = 'PAID'))");
        }
        if (notBlank(q)) {
            String text = q.strip();
            where.append(" and (r.code ilike :like or r.customer_name ilike :like or r.phone ilike :like");
            params.put("like", "%" + escapeLike(text) + "%");
            String digits = text.replaceAll("\\D", "");
            if (digits.length() >= 3) {
                where.append(" or r.phone_norm like :digits");
                params.put("digits", "%" + digits + "%");
            }
            where.append(")");
        }
        List<RequestRow> items = jdbc.sql(UNION + "select * from r" + where
                        + " order by r.created_at desc, r.kind, r.id desc limit :limit offset :offset")
                .params(params).param("limit", safeSize).param("offset", (long) (safePage - 1) * safeSize)
                .query((rs, n) -> new RequestRow(rs.getString("kind"), rs.getLong("id"), rs.getString("code"),
                        rs.getString("customer_name"), rs.getString("phone"), Rows.time(rs, "created_at"),
                        rs.getInt("item_count"), Rows.longOrNull(rs, "total"),
                        rs.getString("payment_method") == null ? null
                                : PaymentMethod.valueOf(rs.getString("payment_method")),
                        rs.getString("status"), rs.getString("assignee_name")))
                .list();
        Totals totals = jdbc.sql(UNION + "select count(*) as cnt, coalesce(sum(r.total), 0) as amount from r" + where)
                .params(params)
                .query((rs, n) -> new Totals(rs.getLong("cnt"), rs.getLong("amount")))
                .single();
        return new RequestList(items, safePage, safeSize, totals.count(), totals);
    }

    @Transactional(readOnly = true)
    public RequestCounters counters() {
        return jdbc.sql("""
                select
                  (select count(*) from quote_request where status = 'NEW') as new_quotes,
                  (select count(*) from customer_order where status = 'PENDING') as pending_orders,
                  (select count(*) from customer_order
                    where (payment_method = 'COD' and status = 'CONFIRMED')
                       or (payment_method = 'BANK_TRANSFER' and status = 'PAID')) as awaiting_kiotviet,
                  (select count(*) from bank_transaction where status in ('REVIEW', 'RECEIVED')) as bank_review
                """)
                .query((rs, n) -> new RequestCounters(rs.getLong("new_quotes"), rs.getLong("pending_orders"),
                        rs.getLong("awaiting_kiotviet"), rs.getLong("bank_review")))
                .single();
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private static String escapeLike(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
