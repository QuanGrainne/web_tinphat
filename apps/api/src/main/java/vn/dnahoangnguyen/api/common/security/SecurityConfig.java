package vn.dnahoangnguyen.api.common.security;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.savedrequest.NullRequestCache;
import vn.dnahoangnguyen.api.admin.auth.LoginAttemptService;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;
import vn.dnahoangnguyen.api.common.ratelimit.ClientIpResolver;
import vn.dnahoangnguyen.api.common.ratelimit.FixedWindowRateLimiter;

/**
 * The URL security table lives here and only here; finer rules use {@code @PreAuthorize} in services:
 * <ul>
 *   <li>{@code /api/public/**}, {@code /api/webhooks/**}: anonymous, stateless chain with no CSRF, no session and no
 *       cookies (webhooks authenticate by API key inside the controller)</li>
 *   <li>{@code /api/auth/**}: anonymous (csrf, login, logout)</li>
 *   <li>{@code /api/admin/**}: signed-in admin; session re-checked on every request</li>
 *   <li>{@code /actuator/health}: anonymous; everything else is denied</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    /** Public storefront API and vendor webhooks: nothing here may depend on, or create, a session. */
    @Bean
    @Order(1)
    public SecurityFilterChain publicFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/api/public/**", "/api/webhooks/**")
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(cache -> cache.requestCache(new NullRequestCache()));
        return http.build();
    }

    /** Admin API, login/logout, health; session cookie plus CSRF double-submit token for single-page clients. */
    @Bean
    @Order(2)
    public SecurityFilterChain adminFilterChain(HttpSecurity http, JsonAuthHandlers handlers,
                                                AppUserRepository users, Clock clock,
                                                LoginAttemptService loginAttempts,
                                                FixedWindowRateLimiter limiter, ClientIpResolver ips)
            throws Exception {
        SessionValidityFilter sessionValidity = new SessionValidityFilter(users, clock, handlers.entryPoint());
        LoginThrottleFilter loginThrottle = new LoginThrottleFilter(limiter, loginAttempts, ips, handlers);

        http
                .csrf(csrf -> csrf.spa())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/error").permitAll()
                        .requestMatchers("/api/admin/**").authenticated()
                        .anyRequest().denyAll())
                // a custom login page URL stops Spring generating its HTML login page
                .formLogin(form -> form
                        .loginPage(LoginThrottleFilter.LOGIN_PATH)
                        .loginProcessingUrl(LoginThrottleFilter.LOGIN_PATH)
                        .successHandler(loginSuccess(handlers, loginAttempts, clock, ips))
                        .failureHandler(loginFailure(handlers, loginAttempts, ips)))
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .invalidateHttpSession(true)
                        .deleteCookies("DNA_SESSION")
                        .logoutSuccessHandler((request, response, authentication) ->
                                response.setStatus(HttpStatus.NO_CONTENT.value())))
                .requestCache(cache -> cache.requestCache(new NullRequestCache()))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(handlers.entryPoint())
                        .accessDeniedHandler(handlers.accessDenied()))
                .addFilterAfter(sessionValidity, SecurityContextHolderFilter.class)
                .addFilterBefore(loginThrottle, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private static AuthenticationSuccessHandler loginSuccess(JsonAuthHandlers handlers, LoginAttemptService attempts,
                                                             Clock clock, ClientIpResolver ips) {
        return (request, response, authentication) -> {
            attempts.recordSuccess(LoginAttemptService.key(request.getParameter("username"), ips.ipKey(request)));
            request.getSession().setAttribute(SessionValidityFilter.AUTH_TIME_ATTR, clock.instant());
            handlers.success().onAuthenticationSuccess(request, response, authentication);
        };
    }

    private static AuthenticationFailureHandler loginFailure(JsonAuthHandlers handlers, LoginAttemptService attempts,
                                                             ClientIpResolver ips) {
        return (request, response, exception) -> {
            attempts.recordFailure(LoginAttemptService.key(request.getParameter("username"), ips.ipKey(request)));
            handlers.failure().onAuthenticationFailure(request, response, exception);
        };
    }

    /**
     * {bcrypt} hashes; strength is tunable because one verify should cost a few hundred ms on the server. Hashes
     * pasted into the database without the {@code {bcrypt}} prefix (the SQL account runbook) still verify.
     */
    @Bean
    public PasswordEncoder passwordEncoder(@Value("${dna.security.bcrypt-strength:12}") int strength) {
        BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder(strength);
        Map<String, PasswordEncoder> encoders = new HashMap<>();
        encoders.put("bcrypt", bcrypt);
        DelegatingPasswordEncoder encoder = new DelegatingPasswordEncoder("bcrypt", encoders);
        encoder.setDefaultPasswordEncoderForMatches(bcrypt);
        return encoder;
    }
}
