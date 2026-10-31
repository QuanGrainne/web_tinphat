package vn.dnahoangnguyen.api.admin.user;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    /**
     * Case-insensitive lookup. A plain {@code username = ?} would bind the parameter as text and compare
     * case-sensitively even though the column is citext, hence the explicit {@code lower()}.
     */
    @Query("select u from AppUser u where lower(u.username) = lower(:username)")
    Optional<AppUser> findByUsername(@Param("username") String username);
}
