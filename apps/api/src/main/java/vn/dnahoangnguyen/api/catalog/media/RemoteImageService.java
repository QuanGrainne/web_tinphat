package vn.dnahoangnguyen.api.catalog.media;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import vn.dnahoangnguyen.api.common.error.DomainException;

/**
 * Copies pictures that live on another server (KiotViet's CDN) into the site's own uploads directory, so a photo
 * deleted there does not disappear here. Only HTTPS addresses on the allowed hosts are fetched; anything else is left
 * as it is.
 */
@Service
public class RemoteImageService {

    /** How many stored addresses were copied and how many are still links to another server. */
    public record LocalizeReport(int found, int saved, int failed) {
    }

    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final ImageDownloader downloader;
    private final ImageUploadService uploads;
    private final List<String> allowedHosts;

    public RemoteImageService(JdbcTemplate jdbc, TransactionTemplate tx, ImageDownloader downloader, ImageUploadService uploads,
                              @Value("${dna.image-import.allowed-hosts:kiotviet.vn}") String allowedHosts) {
        this.jdbc = jdbc;
        this.tx = tx;
        this.downloader = downloader;
        this.uploads = uploads;
        this.allowedHosts = Arrays.stream(allowedHosts.split(","))
                .map(h -> h.trim().toLowerCase(Locale.ROOT))
                .filter(h -> !h.isEmpty())
                .toList();
    }

    /** True for an absolute web address, i.e. a picture that is kept on someone else's server. */
    public static boolean isRemote(String url) {
        if (url == null) {
            return false;
        }
        String lower = url.trim().toLowerCase(Locale.ROOT);
        return lower.startsWith("https://") || lower.startsWith("http://");
    }

    /**
     * The site's own copy of a remote picture, downloading it the first time. Empty when it cannot be fetched (host not
     * allowed, server down, not a JPG/PNG/WebP, too large); the caller then keeps the original address.
     */
    public Optional<String> localize(String url) {
        if (!isRemote(url)) {
            return Optional.ofNullable(url);
        }
        String source = url.trim();
        List<String> known = jdbc.queryForList("select local_url from imported_image where source_url = ?", String.class, source);
        if (!known.isEmpty() && uploads.exists(known.get(0))) {
            return Optional.of(known.get(0));
        }
        URI uri = allowed(source);
        if (uri == null) {
            return Optional.empty();
        }
        Optional<byte[]> bytes = downloader.download(uri, ImageUploadService.MAX_BYTES);
        if (bytes.isEmpty()) {
            return Optional.empty();
        }
        String local;
        try {
            local = uploads.storeBytes(bytes.get());
        } catch (DomainException notAnImage) {
            return Optional.empty();
        }
        jdbc.update("""
                insert into imported_image (source_url, local_url) values (?, ?)
                on conflict (source_url) do update set local_url = excluded.local_url, created_at = now()""", source, local);
        return Optional.of(local);
    }

    /** Distinct product, gallery and category pictures that are still links to another server. */
    public int remoteCount() {
        return storedRemoteUrls().size();
    }

    /** Copies every stored remote picture and points the products and categories at the copy. */
    public LocalizeReport localizeStored() {
        List<String> urls = storedRemoteUrls();
        int saved = 0;
        for (String url : urls) {
            Optional<String> local = localize(url);
            if (local.isPresent() && !local.get().equals(url)) {
                replace(url, local.get());
                saved++;
            }
        }
        return new LocalizeReport(urls.size(), saved, urls.size() - saved);
    }

    private List<String> storedRemoteUrls() {
        return jdbc.queryForList("""
                select url from (
                    select image_url as url from product where image_url ~* '^https?://'
                    union select url from product_image where url ~* '^https?://'
                    union select image_url from category where image_url ~* '^https?://'
                ) remote order by url""", String.class);
    }

    /** Version and updated_at move, so an editor holding the old row is told it changed. */
    private void replace(String from, String to) {
        tx.executeWithoutResult(status -> {
            jdbc.update("update product set image_url = ?, version = version + 1, updated_at = now() where image_url = ?", to, from);
            jdbc.update("""
                    update product set version = version + 1, updated_at = now()
                    where id in (select product_id from product_image where url = ?)""", from);
            jdbc.update("update product_image set url = ? where url = ?", to, from);
            jdbc.update("update category set image_url = ?, version = version + 1, updated_at = now() where image_url = ?", to, from);
        });
    }

    /** The address as a URI when it is HTTPS on an allowed host (or a subdomain of one); null otherwise. */
    URI allowed(String url) {
        try {
            URI uri = new URI(url);
            String host = uri.getHost();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null || uri.getUserInfo() != null
                    || (uri.getPort() != -1 && uri.getPort() != 443)) {
                return null;
            }
            String h = host.toLowerCase(Locale.ROOT);
            return allowedHosts.stream().anyMatch(a -> h.equals(a) || h.endsWith("." + a)) ? uri : null;
        } catch (URISyntaxException e) {
            return null;
        }
    }
}
