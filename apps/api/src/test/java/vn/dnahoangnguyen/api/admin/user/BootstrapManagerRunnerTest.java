package vn.dnahoangnguyen.api.admin.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.dnahoangnguyen.api.admin.audit.AuditActor;
import vn.dnahoangnguyen.api.admin.audit.AuditService;

class BootstrapManagerRunnerTest {

    private static final String PASSWORD = "twelve chars!";

    private final AppUserRepository users = mock(AppUserRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final AuditService audit = mock(AuditService.class);

    private BootstrapManagerRunner runner(String username, String password) {
        when(encoder.encode(any())).thenAnswer(invocation -> "{bcrypt}hash-of-" + invocation.getArgument(0));
        when(users.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        return new BootstrapManagerRunner(users, encoder, audit, username, password, "Quản lý");
    }

    @Test
    void createsTheManagerWhenNoUserExists() {
        when(users.count()).thenReturn(0L);

        runner("owner", PASSWORD).run(new DefaultApplicationArguments());

        ArgumentCaptor<AppUser> saved = ArgumentCaptor.forClass(AppUser.class);
        verify(users).save(saved.capture());
        assertThat(saved.getValue().getUsername()).isEqualTo("owner");
        assertThat(saved.getValue().getRole()).isEqualTo(Role.MANAGER);
        assertThat(saved.getValue().getPasswordHash()).isEqualTo("{bcrypt}hash-of-" + PASSWORD);
        assertThat(saved.getValue().isEnabled()).isTrue();
        verify(audit).recordAs(any(AuditActor.class), eq("USER_BOOTSTRAP"), eq("USER"), any(),
                eq(null), eq(Map.of("username", "owner", "role", "MANAGER")));
    }

    @Test
    void neverCreatesASecondAccount() {
        when(users.count()).thenReturn(1L);

        runner("owner", PASSWORD).run(new DefaultApplicationArguments());

        verify(users, never()).save(any());
        verify(audit, never()).recordAs(any(), any(), any(), any(), any(), any());
    }

    @Test
    void skipsTheAccountInsteadOfCrashingWhenThePasswordExceedsBcryptsSeventyTwoBytes() {
        when(users.count()).thenReturn(0L);
        // the real encoder throws on more than 72 bytes: starting up must still succeed without an account
        when(encoder.encode(any())).thenThrow(new IllegalArgumentException("password cannot be more than 72 bytes"));

        BootstrapManagerRunner ascii = runnerKeepingEncoder("owner", "p".repeat(80));
        ascii.run(new DefaultApplicationArguments());
        // 30 characters, 90 bytes: long in bytes although short in characters
        BootstrapManagerRunner accented = runnerKeepingEncoder("owner", "ệ".repeat(30));
        accented.run(new DefaultApplicationArguments());

        verify(users, never()).save(any());
        verify(encoder, never()).encode(any());
    }

    @Test
    void acceptsAPasswordOfExactlySeventyTwoBytes() {
        when(users.count()).thenReturn(0L);

        runner("owner", "p".repeat(72)).run(new DefaultApplicationArguments());
        verify(users).save(any(AppUser.class));
    }

    private BootstrapManagerRunner runnerKeepingEncoder(String username, String password) {
        when(users.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        return new BootstrapManagerRunner(users, encoder, audit, username, password, "Quản lý");
    }

    @Test
    void rejectsAPasswordShorterThanTwelveCharacters() {
        when(users.count()).thenReturn(0L);

        runner("owner", "short-pass1").run(new DefaultApplicationArguments());

        verify(users, never()).save(any());
    }

    @Test
    void rejectsAnInvalidUsername() {
        when(users.count()).thenReturn(0L);

        runner("a b", PASSWORD).run(new DefaultApplicationArguments());

        verify(users, never()).save(any());
    }

    @Test
    void doesNothingWithoutConfiguration() {
        when(users.count()).thenReturn(0L);

        runner("", "").run(new DefaultApplicationArguments());

        verify(users, never()).save(any());
    }
}
