package vn.dnahoangnguyen.api.sales.notify;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import vn.dnahoangnguyen.api.settings.SettingsService;

class EmailNotificationAdapterTest {

    private final JavaMailSender sender = mock(JavaMailSender.class);
    private final SettingsService settings = mock(SettingsService.class);
    private final EmailNotificationAdapter adapter =
            new EmailNotificationAdapter(sender, settings, "http://localhost:8000/", "no-reply@example.test");

    @BeforeEach
    void stubSender() {
        when(settings.ownerEmail()).thenReturn("owner@example.test");
        when(sender.createMimeMessage()).thenAnswer(call -> new MimeMessage(Session.getInstance(new Properties())));
    }

    private MimeMessage sent() {
        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(captor.capture());
        return captor.getValue();
    }

    @Test
    void newOrderMailCarriesTheCodeTotalCustomerAndAdminLink() throws Exception {
        adapter.newOrder("DNA7K2M9Q", "Nguyễn Văn A", 93_000, "COD");

        MimeMessage message = sent();
        assertThat(message.getSubject()).isEqualTo("[DNA] Đơn hàng mới DNA7K2M9Q - 93.000đ");
        assertThat(message.getAllRecipients()[0].toString()).isEqualTo("owner@example.test");
        String body = (String) message.getContent();
        assertThat(body).contains("DNA7K2M9Q").contains("Nguyễn Văn A").contains("93.000đ")
                .contains("http://localhost:8000/admin/requests");
    }

    @Test
    void newQuoteMailCarriesTheCode() throws Exception {
        adapter.newQuote("BG7K2M9Q", "Công ty ABC", true);
        assertThat(sent().getSubject()).contains("BG7K2M9Q");
    }

    @Test
    void bankMailsAreSent() throws Exception {
        adapter.bankReviewPending(5, 120_000, "DNA123 chuyen khoan");
        assertThat(sent().getSubject()).isEqualTo("[DNA] Giao dịch ngân hàng cần xử lý - 120.000đ");
    }

    @Test
    void aFailingSmtpServerIsLoggedAndNeverThrown() {
        doThrow(new MailSendException("smtp down")).when(sender).send(any(MimeMessage.class));
        assertThatCode(() -> adapter.newOrder("DNA7K2M9Q", "A", 1_000, "COD")).doesNotThrowAnyException();
    }

    @Test
    void noMailWhenTheOwnerEmailIsNotSet() {
        when(settings.ownerEmail()).thenReturn("");
        adapter.newOrder("DNA7K2M9Q", "A", 1_000, "COD");
        verify(sender, never()).send(any(MimeMessage.class));
    }
}
