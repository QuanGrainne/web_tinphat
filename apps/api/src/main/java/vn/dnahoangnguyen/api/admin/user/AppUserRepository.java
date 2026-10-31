package vn.dnahoangnguyen.api.admin.user;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    /** Case-insensitive because the column is citext. */
    Optional<AppUser> findByUsername(String username);
}
