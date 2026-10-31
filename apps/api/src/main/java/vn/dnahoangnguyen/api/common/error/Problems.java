package vn.dnahoangnguyen.api.common.error;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;

/**
 * Builds the one problem body every error response uses:
 * {@code {type, title, status, detail, instance, code, errors?, ...extensions}}.
 * Plain maps keep servlet filters and controller advice on the same representation.
 */
public final class Problems {

    public record FieldViolation(String field, String message) {
    }

    private Problems() {
    }

    public static Map<String, Object> body(HttpStatus status, ProblemCode code, String detailVi, String instance,
                                           List<FieldViolation> errors, Map<String, Object> extensions) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "about:blank");
        body.put("title", status.getReasonPhrase());
        body.put("status", status.value());
        body.put("detail", detailVi);
        if (instance != null) {
            body.put("instance", instance);
        }
        body.put("code", code.name());
        if (errors != null && !errors.isEmpty()) {
            List<Map<String, String>> list = new ArrayList<>();
            for (FieldViolation error : errors) {
                Map<String, String> entry = new LinkedHashMap<>();
                entry.put("field", error.field());
                entry.put("message", error.message());
                list.add(entry);
            }
            body.put("errors", list);
        }
        if (extensions != null) {
            extensions.forEach(body::putIfAbsent);
        }
        return body;
    }

    // Default Vietnamese messages, shared by the advice and the security handlers.
    public static final String DETAIL_VALIDATION = "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.";
    public static final String DETAIL_UNAUTHENTICATED = "Vui lòng đăng nhập để tiếp tục.";
    public static final String DETAIL_FORBIDDEN = "Bạn không có quyền thực hiện thao tác này.";
    public static final String DETAIL_NOT_FOUND = "Không tìm thấy dữ liệu yêu cầu.";
    public static final String DETAIL_VERSION_CONFLICT = "Dữ liệu đã bị người khác thay đổi. Tải lại để tiếp tục.";
    public static final String DETAIL_DUPLICATE = "Dữ liệu đã tồn tại (trùng mã, tên hoặc đường dẫn).";
    public static final String DETAIL_CONFLICT_STATE = "Không thể thực hiện vì dữ liệu đang được sử dụng ở nơi khác.";
    public static final String DETAIL_RATE_LIMITED = "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
    public static final String DETAIL_INTERNAL = "Hệ thống đang gặp lỗi. Vui lòng thử lại sau.";
}
