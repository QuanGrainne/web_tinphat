package vn.dnahoangnguyen.api.admin.auth;

import java.time.Duration;

/** Sends the password reset link. Implementations must never log the link: it works like a password. */
public interface PasswordResetMailer {

    void send(String to, String displayName, String link, Duration validFor);
}
