package vn.dnahoangnguyen.api.sales;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import vn.dnahoangnguyen.api.sales.order.OrderStatus;
import vn.dnahoangnguyen.api.sales.order.PaymentMethod;
import vn.dnahoangnguyen.api.sales.pricing.CartLineIn;
import vn.dnahoangnguyen.api.sales.pricing.PricedLine;
import vn.dnahoangnguyen.api.sales.quote.QuoteStatus;

/** Public request and response bodies; component names are the property names of the API contract. */
public final class SalesDtos {

    private SalesDtos() {
    }

    public record CartPriceRequest(
            @NotNull(message = "Giỏ hàng không hợp lệ.") @Size(max = 500, message = "Giỏ hàng quá lớn.")
            List<@Valid CartLineIn> lines) {
    }

    public record QuoteSubmit(
            @NotNull(message = "Thiếu mã gửi yêu cầu.") UUID submissionId,
            @NotBlank(message = "Vui lòng nhập tên người liên hệ.") @Size(max = 200, message = "Tên quá dài.") String customerName,
            @NotBlank(message = "Vui lòng nhập số điện thoại.") @Size(max = 40, message = "Số điện thoại quá dài.") String phone,
            @Email(message = "Email không hợp lệ.") @Size(max = 200, message = "Email quá dài.") String email,
            @Size(max = 300, message = "Tên công ty quá dài.") String company,
            @Size(max = 40, message = "Mã số thuế quá dài.") String taxCode,
            @Size(max = 2000, message = "Ghi chú quá dài.") String note,
            @Size(max = 200) String website,
            @NotNull(message = "Giỏ hàng không hợp lệ.") @Size(min = 1, max = 500, message = "Giỏ hàng không hợp lệ.")
            List<@Valid CartLineIn> lines) {
    }

    public record QuoteView(
            String code, QuoteStatus status, OffsetDateTime createdAt, String customerName,
            List<PricedLine> lines, long subtotal, boolean hasContactLines) {
    }

    public record OrderSubmit(
            @NotNull(message = "Thiếu mã gửi đơn hàng.") UUID submissionId,
            @NotBlank(message = "Vui lòng nhập họ tên.") @Size(max = 200, message = "Tên quá dài.") String customerName,
            @NotBlank(message = "Vui lòng nhập số điện thoại.") @Size(max = 40, message = "Số điện thoại quá dài.") String phone,
            @NotBlank(message = "Vui lòng nhập địa chỉ nhận hàng.") @Size(max = 500, message = "Địa chỉ quá dài.") String address,
            @Size(max = 2000, message = "Ghi chú quá dài.") String note,
            @NotNull(message = "Vui lòng chọn hình thức thanh toán.") PaymentMethod paymentMethod,
            @NotNull(message = "Thiếu tổng tiền hiển thị.") Long expectedTotal,
            @Size(max = 200) String website,
            @NotNull(message = "Giỏ hàng không hợp lệ.") @Size(min = 1, max = 500, message = "Giỏ hàng không hợp lệ.")
            List<@Valid CartLineIn> lines) {
    }

    public record OrderItemView(
            String skuCode, String productName, String unitName, int conversion, int qty,
            long listPrice, long unitPrice, long lineTotal) {
    }

    /** Receiving account shown to the customer; {@code content} is the order code. */
    public record BankBlock(String bankName, String bin, String accountNo, String accountName, String content) {
    }

    public record OrderView(
            String code, OrderStatus status, PaymentMethod paymentMethod, OffsetDateTime createdAt,
            String customerName, String phoneMasked,
            List<OrderItemView> items, long subtotal, long discountTotal, String discountNote,
            Long shippingFee, long total, BankBlock bank, Long qrAmount, OffsetDateTime paidAt) {
    }

    public record LookupRequest(
            @NotBlank(message = "Vui lòng nhập mã đơn hàng.") @Size(max = 40) String code,
            @NotBlank(message = "Vui lòng nhập số điện thoại.") @Size(max = 40) String phone) {
    }

    /** A stored result and whether this call created it (201) or replayed it (200). */
    public record Submitted<T>(T view, boolean created) {
    }
}
