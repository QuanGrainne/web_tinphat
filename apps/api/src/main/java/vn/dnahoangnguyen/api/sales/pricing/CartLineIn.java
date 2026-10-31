package vn.dnahoangnguyen.api.sales.pricing;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** One basket line as sent by the browser. Prices are never accepted from the client. */
public record CartLineIn(
        @NotNull(message = "Thiếu mã sản phẩm.") Long skuId,
        @NotNull(message = "Vui lòng nhập số lượng.")
        @Min(value = 1, message = "Số lượng tối thiểu là 1.")
        @Max(value = 9999, message = "Số lượng tối đa là 9.999.") Integer qty) {
}
