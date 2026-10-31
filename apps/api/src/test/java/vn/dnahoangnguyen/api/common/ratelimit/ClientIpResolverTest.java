package vn.dnahoangnguyen.api.common.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class ClientIpResolverTest {

    private final ClientIpResolver resolver = new ClientIpResolver("CF-Connecting-IP");

    private static MockHttpServletRequest request(String remoteAddr) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddr);
        return request;
    }

    @Test
    void usesTrustedHeader() {
        MockHttpServletRequest request = request("10.0.0.5");
        request.addHeader("CF-Connecting-IP", " 203.0.113.9 ");
        assertThat(resolver.clientIp(request)).isEqualTo("203.0.113.9");
    }

    @Test
    void ignoresXForwardedFor() {
        MockHttpServletRequest request = request("10.0.0.5");
        request.addHeader("X-Forwarded-For", "198.51.100.1");
        assertThat(resolver.clientIp(request)).isEqualTo("10.0.0.5");
    }

    @Test
    void fallsBackToRemoteAddressWhenHeaderMissing() {
        assertThat(resolver.clientIp(request("192.0.2.44"))).isEqualTo("192.0.2.44");
    }

    @Test
    void fallsBackWhenHeaderIsNotAnIpLiteral() {
        MockHttpServletRequest request = request("192.0.2.44");
        request.addHeader("CF-Connecting-IP", "evil.example.com");
        assertThat(resolver.clientIp(request)).isEqualTo("192.0.2.44");
        request.removeHeader("CF-Connecting-IP");
        request.addHeader("CF-Connecting-IP", "1.2.3");
        assertThat(resolver.clientIp(request)).isEqualTo("192.0.2.44");
    }

    @Test
    void ipv4KeyIsTheAddress() {
        MockHttpServletRequest request = request("10.0.0.5");
        request.addHeader("CF-Connecting-IP", "203.0.113.9");
        assertThat(resolver.ipKey(request)).isEqualTo("203.0.113.9");
    }

    @Test
    void ipv6AddressesInOneSlash64ShareAKey() {
        MockHttpServletRequest a = request("10.0.0.5");
        a.addHeader("CF-Connecting-IP", "2001:db8:abcd:12::1");
        MockHttpServletRequest b = request("10.0.0.5");
        b.addHeader("CF-Connecting-IP", "2001:0db8:abcd:0012:ffff:ffff:ffff:ffff");
        MockHttpServletRequest other = request("10.0.0.5");
        other.addHeader("CF-Connecting-IP", "2001:db8:abcd:13::1");

        assertThat(resolver.ipKey(a)).isEqualTo(resolver.ipKey(b)).isEqualTo("v6:20010db8abcd0012");
        assertThat(resolver.ipKey(other)).isNotEqualTo(resolver.ipKey(a));
    }

    @Test
    void ipv4MappedIpv6KeysAsIpv4() {
        MockHttpServletRequest request = request("10.0.0.5");
        request.addHeader("CF-Connecting-IP", "::ffff:203.0.113.9");
        assertThat(resolver.ipKey(request)).isEqualTo("203.0.113.9");
    }
}
