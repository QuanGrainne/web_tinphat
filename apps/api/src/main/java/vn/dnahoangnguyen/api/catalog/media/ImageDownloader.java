package vn.dnahoangnguyen.api.catalog.media;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Fetches one picture over HTTPS. Redirects are not followed, so the address that was checked is the one that is read,
 * and a body larger than the limit is refused rather than cut short.
 */
@Component
public class ImageDownloader {

    private static final Logger log = LoggerFactory.getLogger(ImageDownloader.class);

    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    /** The body of a 200 answer of at most {@code maxBytes}; empty when the server fails, refuses or sends more. */
    public Optional<byte[]> download(URI uri, long maxBytes) {
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(20))
                .header("User-Agent", "TinPhatDecor-ImageImport/1.0")
                .GET()
                .build();
        try {
            HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
            try (InputStream body = response.body()) {
                if (response.statusCode() != 200) {
                    log.warn("Image download refused: HTTP {} for host {}", response.statusCode(), uri.getHost());
                    return Optional.empty();
                }
                byte[] bytes = body.readNBytes((int) maxBytes + 1);
                if (bytes.length > maxBytes) {
                    log.warn("Image download refused: larger than {} bytes from host {}", maxBytes, uri.getHost());
                    return Optional.empty();
                }
                return Optional.of(bytes);
            }
        } catch (IOException e) {
            log.warn("Image download failed for host {}: {}", uri.getHost(), e.toString());
            return Optional.empty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        }
    }
}
