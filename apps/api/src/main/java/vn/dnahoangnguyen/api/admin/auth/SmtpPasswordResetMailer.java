package vn.dnahoangnguyen.api.admin.auth;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Plain-text Vietnamese reset mail through the configured SMTP server (Mailpit locally, Gmail or another provider in
 * production, see {@code SPRING_MAIL_*}). Sent in the background so the answer to the request does not depend on whether
 * the address belongs to an account. Without SMTP the mail is skipped and only that fact is logged.
 */
@Component
public class SmtpPasswordResetMailer implements PasswordResetMailer {

    private static final Logger log = LoggerFactory.getLogger(SmtpPasswordResetMailer.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String from;

    public SmtpPasswordResetMailer(ObjectProvider<JavaMailSender> mailSender,
                                   @Value("${dna.mail.from:no-reply@tinphatdecor.vn}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    @Async
    @Override
    public void send(String to, String displayName, String link, Duration validFor) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.warn("SMTP is not configured (mail profile off); the password reset email was not sent");
            return;
        }
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject("[Tín Phát Decor] Đặt lại mật khẩu quản trị");
            helper.setText("""
                    Xin chào %s,

                    Có yêu cầu đặt lại mật khẩu cho tài khoản quản trị website Tín Phát Decor.
                    Mở liên kết sau để đặt mật khẩu mới. Liên kết dùng được một lần và hết hạn sau %d phút:

                    %s

                    Nếu bạn không yêu cầu, hãy bỏ qua email này. Mật khẩu hiện tại vẫn giữ nguyên.
                    """.formatted(displayName, validFor.toMinutes(), link));
            sender.send(message);
        } catch (MessagingException | MailException e) {
            log.error("Could not send the password reset email: {}", e.getMessage());
        }
    }
}
