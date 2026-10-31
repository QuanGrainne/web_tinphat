package vn.dnahoangnguyen.api.sales.notify;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import vn.dnahoangnguyen.api.sales.SalesIntegrationTest;

/**
 * Whole path with the {@code mail} profile: order committed, event fired after commit, mail handed to an SMTP server
 * (a tiny in-JVM one), and an SMTP failure leaving the order untouched.
 */
@ActiveProfiles("mail")
class EmailWiringIT extends SalesIntegrationTest {

    private static final FakeSmtpServer SMTP = new FakeSmtpServer();

    @DynamicPropertySource
    static void smtp(DynamicPropertyRegistry registry) {
        registry.add("spring.mail.host", () -> "127.0.0.1");
        registry.add("spring.mail.port", SMTP::port);
    }

    @Test
    void newOrderMailReachesTheOwnerWithTheCodeInTheSubject() throws Exception {
        SMTP.down = false;
        long sku = createSku(31_000L, true);
        String code = placeOrder("COD", sku, 3, 93_000, randomIp()).get("code").asText();

        await().atMost(Duration.ofSeconds(15)).untilAsserted(() ->
                assertThat(SMTP.subjects()).anyMatch(s -> s.equals("[DNA] Đơn hàng mới " + code + " - 93.000đ")));
    }

    @Test
    void anSmtpFailureNeverFailsTheOrder() throws Exception {
        SMTP.down = true;
        try {
            long sku = createSku(10_000L, true);
            postPublic("/api/public/orders", orderBody(UUID.randomUUID(), "COD", 10_000, List.of(line(sku, 1))), randomIp())
                    .andExpect(status().isCreated());
            Long stored = jdbc.queryForObject("select count(*) from customer_order where total = 10000", Long.class);
            assertThat(stored).isGreaterThanOrEqualTo(1L);
        } finally {
            SMTP.down = false;
        }
    }

    /** Accepts connections on a random loopback port and keeps every message handed to it. */
    static final class FakeSmtpServer {

        private final ServerSocket server;
        private final List<byte[]> messages = new CopyOnWriteArrayList<>();
        volatile boolean down;

        FakeSmtpServer() {
            try {
                server = new ServerSocket(0, 10, InetAddress.getLoopbackAddress());
            } catch (IOException e) {
                throw new IllegalStateException(e);
            }
            Thread thread = new Thread(this::serve, "fake-smtp");
            thread.setDaemon(true);
            thread.start();
        }

        int port() {
            return server.getLocalPort();
        }

        List<String> subjects() {
            return messages.stream().map(raw -> {
                try {
                    return new MimeMessage(Session.getInstance(new Properties()), new ByteArrayInputStream(raw)).getSubject();
                } catch (Exception e) {
                    return "unreadable: " + e.getMessage();
                }
            }).toList();
        }

        private void serve() {
            while (!server.isClosed()) {
                try (Socket socket = server.accept()) {
                    converse(socket);
                } catch (IOException e) {
                    // connection dropped; wait for the next one
                }
            }
        }

        private void converse(Socket socket) throws IOException {
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.ISO_8859_1));
            Writer out = new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.ISO_8859_1);
            if (down) {
                reply(out, "421 service not available");
                return;
            }
            reply(out, "220 fake ESMTP");
            String line;
            while ((line = in.readLine()) != null) {
                String command = line.toUpperCase();
                if (command.startsWith("DATA")) {
                    reply(out, "354 go ahead");
                    StringBuilder data = new StringBuilder();
                    while ((line = in.readLine()) != null && !line.equals(".")) {
                        data.append(line.startsWith("..") ? line.substring(1) : line).append("\r\n");
                    }
                    messages.add(data.toString().getBytes(StandardCharsets.ISO_8859_1));
                    reply(out, "250 queued");
                } else if (command.startsWith("QUIT")) {
                    reply(out, "221 bye");
                    return;
                } else {
                    reply(out, "250 OK");
                }
            }
        }

        private static void reply(Writer out, String text) throws IOException {
            out.write(text + "\r\n");
            out.flush();
        }
    }
}
