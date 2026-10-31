package vn.dnahoangnguyen.api.common.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.HexFormat;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Finds the caller's IP for rate limiting. The edge proxy (Cloudflare in production, Caddy in dev and compose)
 * sets a single trusted header; {@code X-Forwarded-For} is never consulted because a client can forge it.
 */
@Component
public class ClientIpResolver {

    private static final Logger log = LoggerFactory.getLogger(ClientIpResolver.class);
    private static final Pattern IPV4 = Pattern.compile("(\\d{1,3})(\\.\\d{1,3}){3}");
    private static final Pattern IPV6_CHARS = Pattern.compile("[0-9a-fA-F:.]{2,45}");

    private final String headerName;
    private final AtomicBoolean warnedMissingHeader = new AtomicBoolean();

    public ClientIpResolver(@Value("${dna.client-ip-header:CF-Connecting-IP}") String headerName) {
        this.headerName = headerName;
    }

    /** Value of the trusted header when it is a valid IP literal, otherwise the TCP peer address. */
    public String clientIp(HttpServletRequest request) {
        String header = request.getHeader(headerName);
        if (header != null) {
            String candidate = header.trim();
            if (isIpLiteral(candidate)) {
                return candidate;
            }
        }
        if (warnedMissingHeader.compareAndSet(false, true)) {
            log.warn("Header {} missing or not an IP; falling back to the remote address (warned once)", headerName);
        }
        return request.getRemoteAddr();
    }

    /** Rate-limit key: IPv4 as is, IPv6 collapsed to its /64 prefix. */
    public String ipKey(HttpServletRequest request) {
        return ipKey(clientIp(request));
    }

    static String ipKey(String ip) {
        if (ip == null || !ip.contains(":")) {
            return ip;
        }
        try {
            InetAddress address = InetAddress.getByName(ip);
            if (address instanceof Inet4Address) {
                return address.getHostAddress();
            }
            if (address instanceof Inet6Address) {
                byte[] bytes = address.getAddress();
                return "v6:" + HexFormat.of().formatHex(bytes, 0, 8);
            }
        } catch (UnknownHostException e) {
            // not a valid literal: keep the raw value so the key stays stable
        }
        return ip;
    }

    private static boolean isIpLiteral(String value) {
        if (value.isEmpty()) {
            return false;
        }
        if (value.indexOf(':') < 0) {
            return IPV4.matcher(value).matches();
        }
        // a ':' forces literal parsing in the JDK, so this never triggers a DNS lookup
        if (!IPV6_CHARS.matcher(value).matches()) {
            return false;
        }
        try {
            InetAddress.getByName(value);
            return true;
        } catch (UnknownHostException e) {
            return false;
        }
    }
}
