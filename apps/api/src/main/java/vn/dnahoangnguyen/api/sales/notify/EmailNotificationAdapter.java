package vn.dnahoangnguyen.api.sales.notify;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import vn.dnahoangnguyen.api.notify.NotificationPort;
import vn.dnahoangnguyen.api.sales.Vnd;
import vn.dnahoangnguyen.api.settings.SettingsService;

/**
 * Plain-text Vietnamese mails to the owner (SMTP from {@code SPRING_MAIL_*}). A failed send is logged and swallowed:
 * the order or setting that triggered it is already stored.
 */
@Component
@Profile("mail")
public class EmailNotificationAdapter implements NotificationPort {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationAdapter.class);

    private final JavaMailSender mailSender;
    private final SettingsService settings;
    private final String adminLink;
    private final String from;

    public EmailNotificationAdapter(JavaMailSender mailSender, SettingsService settings,
                                    @Value("${dna.site-url}") String siteUrl,
                                    @Value("${dna.mail.from:no-reply@dnahoangnguyen.vn}") String from) {
        this.mailSender = mailSender;
        this.settings = settings;
        this.adminLink = siteUrl.replaceAll("/+$", "") + "/admin/requests";
        this.from = from;
    }

    @Override
    public void newOrder(String code, String customerName, long total, String paymentMethod) {
        String payment = "BANK_TRANSFER".equals(paymentMethod) ? "Chuyển khoản" : "Thanh toán khi nhận hàng (COD)";
        send("[DNA] Đơn hàng mới " + code + " - " + Vnd.format(total), """
                Có đơn hàng mới trên website.

                Mã đơn: %s
                Khách hàng: %s
                Thanh toán: %s
                Tổng tiền hàng: %s (chưa gồm phí giao hàng)

                Xử lý tại: %s
                """.formatted(code, customerName, payment, Vnd.format(total), adminLink));
    }

    @Override
    public void newQuote(String code, String customerName, boolean hasContactLines) {
        send("[DNA] Yêu cầu báo giá mới " + code, """
                Có yêu cầu báo giá mới trên website.

                Mã yêu cầu: %s
                Khách hàng: %s
                %s
                Xử lý tại: %s
                """.formatted(code, customerName,
                hasContactLines ? "Có sản phẩm cần báo giá riêng (giá \"Liên hệ\").\n" : "", adminLink));
    }

    @Override
    public void bankSettingsChanged(String changedBy, String summary) {
        send("[DNA] Thông tin tài khoản ngân hàng vừa được thay đổi", """
                Thông tin tài khoản nhận tiền trên website vừa được thay đổi.

                Người thay đổi: %s
                Nội dung: %s

                Nếu đây không phải thay đổi của bạn, hãy đổi mật khẩu quản trị ngay và kiểm tra lại cài đặt.
                """.formatted(changedBy, summary));
    }

    @Override
    public void bankReviewPending(long transactionId, long amount, String content) {
        send("[DNA] Giao dịch ngân hàng cần xử lý - " + Vnd.format(amount), """
                Có giao dịch chuyển khoản chưa thể tự động gắn vào đơn hàng.

                Số tiền: %s
                Nội dung chuyển khoản: %s

                Vui lòng kiểm tra tại mục "Giao dịch ngân hàng": %s
                """.formatted(Vnd.format(amount), content, adminLink));
    }

    private void send(String subject, String body) {
        try {
            String to = settings.ownerEmail();
            if (to == null || to.isBlank()) {
                log.warn("Owner email is not set; mail '{}' not sent", subject);
                return;
            }
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false);
            mailSender.send(message);
        } catch (MessagingException | RuntimeException e) {
            log.error("Could not send mail '{}'", subject, e);
        }
    }
}
