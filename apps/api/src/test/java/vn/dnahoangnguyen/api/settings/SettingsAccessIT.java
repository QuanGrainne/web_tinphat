package vn.dnahoangnguyen.api.settings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import vn.dnahoangnguyen.api.admin.user.AppUser;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;
import vn.dnahoangnguyen.api.admin.user.Role;
import vn.dnahoangnguyen.api.support.AdminLogin;
import vn.dnahoangnguyen.api.support.IntegrationTest;
import vn.dnahoangnguyen.api.support.TestAuth;

class SettingsAccessIT extends IntegrationTest {

    private static final String PASSWORD = "a long enough password";

    @Autowired
    MockMvc mvc;
    @Autowired
    AppUserRepository users;
    @Autowired
    PasswordEncoder encoder;
    @Autowired
    SettingsService settings;
    @Autowired
    JdbcTemplate jdbc;

    private static String bankBody(String accountNo, String password) {
        return """
                {"bankName":"MB Bank","bin":"970422","accountNo":"%s","accountName":"CONG TY TNHH DNA HOANG NGUYEN","currentPassword":"%s"}
                """.formatted(accountNo, password);
    }

    @Test
    void publicSettingsAreReadableWithoutSignIn() throws Exception {
        mvc.perform(get("/api/public/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.company.taxCode").value("5400533724"))
                .andExpect(jsonPath("$.company.name").value("CÔNG TY TNHH DNA HOÀNG NGUYÊN"))
                .andExpect(jsonPath("$.hotline").value("0366 985 679"))
                .andExpect(jsonPath("$.zalo").value("0366985679"))
                .andExpect(jsonPath("$.trustStrip[0]").value("Giá đã gồm VAT"))
                .andExpect(jsonPath("$.bank").doesNotExist());
    }

    @Test
    void managerReadsAdminSettings() throws Exception {
        AppUser manager = TestAuth.createUser(users, encoder, "settings-reader", PASSWORD, Role.MANAGER);

        mvc.perform(get("/api/admin/settings").with(TestAuth.as(manager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.company.taxCode").value("5400533724"))
                .andExpect(jsonPath("$.notifyOwnerEmail").value("congtydnahoangnguyen@gmail.com"))
                .andExpect(jsonPath("$.pricingMismatchThresholdPct").value(2.0))
                .andExpect(jsonPath("$.discountTiers").isEmpty())
                .andExpect(jsonPath("$.bank.accountNo").exists());
    }

    @Test
    void editorCannotReadOrChangeSettings() throws Exception {
        AppUser editor = TestAuth.createUser(users, encoder, "settings-editor", PASSWORD, Role.EDITOR);

        mvc.perform(get("/api/admin/settings").with(TestAuth.as(editor)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mvc.perform(put("/api/admin/settings/bank").with(TestAuth.as(editor))
                        .with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content(bankBody("0123456789", PASSWORD)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void anonymousCannotChangeBankSettings() throws Exception {
        mvc.perform(put("/api/admin/settings/bank").with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content(bankBody("0123456789", PASSWORD)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void wrongPasswordLeavesTheBankUntouched() throws Exception {
        AppUser manager = TestAuth.createUser(users, encoder, "bank-wrongpw", PASSWORD, Role.MANAGER);
        BankInfo before = settings.bank();

        mvc.perform(put("/api/admin/settings/bank").with(TestAuth.as(manager))
                        .with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content(bankBody("0123456789", "not my password")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.detail").value("Mật khẩu xác nhận không đúng."));

        assertThat(settings.bank()).isEqualTo(before);
    }

    @Test
    void invalidBankFieldsAreReportedPerField() throws Exception {
        AppUser manager = TestAuth.createUser(users, encoder, "bank-invalid", PASSWORD, Role.MANAGER);

        mvc.perform(put("/api/admin/settings/bank").with(TestAuth.as(manager))
                        .with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"bankName":"MB Bank","bin":"12","accountNo":"01 23","accountName":"X","currentPassword":"%s"}
                                """.formatted(PASSWORD)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.length()").value(2));
    }

    @Test
    void managerChangesBankWithPasswordAndItIsAudited() throws Exception {
        AppUser manager = TestAuth.createUser(users, encoder, "bank-ok", PASSWORD, Role.MANAGER);

        mvc.perform(put("/api/admin/settings/bank").with(TestAuth.as(manager))
                        .with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content(bankBody("0987654321", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bankName").value("MB Bank"))
                .andExpect(jsonPath("$.bin").value("970422"))
                .andExpect(jsonPath("$.accountNo").value("0987654321"))
                .andExpect(jsonPath("$.currentPassword").doesNotExist());

        assertThat(settings.bank().accountNo()).isEqualTo("0987654321");
        List<String> afterJson = jdbc.queryForList("""
                select after::text from audit_log
                where action = 'SETTINGS_BANK' and actor_id = ? order by id desc
                """, String.class, manager.getId());
        assertThat(afterJson).hasSize(1);
        assertThat(afterJson.get(0)).contains("0987654321").doesNotContain(PASSWORD);
    }
}
