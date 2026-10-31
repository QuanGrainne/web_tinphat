package vn.dnahoangnguyen.api.sales.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import vn.dnahoangnguyen.api.sales.order.OrderStatus;
import vn.dnahoangnguyen.api.sales.order.PaymentMethod;
import vn.dnahoangnguyen.api.sales.quote.QuoteStatus;

/** Admin request and response bodies; component names are the property names of the API contract. */
public final class AdminDtos {

    private AdminDtos() {
    }

    public record RequestRow(
            String kind, long id, String code, String customerName, String phone, OffsetDateTime createdAt,
            int itemCount, Long total, PaymentMethod paymentMethod, String status, String assigneeName) {
    }

    public record Totals(long count, long totalAmount) {
    }

    public record RequestList(List<RequestRow> items, int page, int size, long total, Totals totals) {
    }

    public record RequestCounters(long newQuotes, long pendingOrders, long awaitingKiotViet, long bankReview) {
    }

    public record HistoryEntry(OffsetDateTime at, String actor, String action, String from, String to, String note) {
    }

    public record PageOf<T>(List<T> items, int page, int pageSize, long total) {
    }

    public record BankTransactionRow(
            long id, OffsetDateTime txTime, long amount, String direction, String accountNoMasked, String content,
            String status, String reviewReason, String orderCode, String decisionNote) {
    }

    public record AdminOrderItem(
            long skuId, String skuCode, String productName, String unitName, int conversion, int qty,
            long listPrice, long unitPrice, long lineTotal) {
    }

    /** {@code requires} holds {@code shippingFee}, {@code paidAmount}, {@code note} or {@code kiotvietOrderCode}. */
    public record AllowedOrderTransition(OrderStatus to, List<String> requires) {
    }

    public record AdminOrder(
            long id, String code, OrderStatus status, PaymentMethod paymentMethod, OffsetDateTime createdAt,
            String customerName, String phone, String address, String note, String internalNote,
            List<AdminOrderItem> items, long subtotal, long discountTotal, String discountNote, Long shippingFee,
            long total, Long paidAmount, String paidVia, OffsetDateTime paidAt, String kiotvietOrderCode,
            boolean awaitsKiotVietEntry, List<AllowedOrderTransition> allowedTransitions,
            List<HistoryEntry> history, List<BankTransactionRow> bankTransactions) {
    }

    public record OrderTransition(
            @NotNull(message = "Vui lòng chọn trạng thái mới.") OrderStatus to, Long shippingFee, Long paidAmount,
            @Size(max = 80, message = "Mã đơn KiotViet quá dài.") String kiotvietOrderCode,
            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự.") String note) {
    }

    public record AdminQuoteLine(
            String skuCode, String productName, String unitName, int conversion, int qty, Long unitPrice,
            Long lineTotal) {
    }

    public record AllowedQuoteTransition(QuoteStatus to) {
    }

    public record AdminQuote(
            long id, String code, QuoteStatus status, OffsetDateTime createdAt, String customerName, String phone,
            String email, String company, String taxCode, String note, String internalNote,
            List<AdminQuoteLine> lines, long subtotal, boolean hasContactLines,
            List<AllowedQuoteTransition> allowedTransitions, List<HistoryEntry> history) {
    }

    public record QuoteTransition(
            @NotNull(message = "Vui lòng chọn trạng thái mới.") QuoteStatus to,
            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự.") String note) {
    }

    public record InternalNoteRequest(@Size(max = 4000, message = "Ghi chú nội bộ quá dài.") String internalNote) {
    }

    public record LinkRequest(
            @NotNull(message = "Vui lòng chọn đơn hàng.") Long orderId, boolean markPaid,
            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự.") String note) {
    }

    public record DismissRequest(
            @NotBlank(message = "Vui lòng nhập lý do bỏ qua.") @Size(max = 500, message = "Ghi chú tối đa 500 ký tự.") String note) {
    }
}
