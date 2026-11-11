package vn.dnahoangnguyen.api.settings;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import vn.dnahoangnguyen.api.admin.user.AppUser;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;
import vn.dnahoangnguyen.api.admin.user.Role;
import vn.dnahoangnguyen.api.support.AdminLogin;
import vn.dnahoangnguyen.api.support.IntegrationTest;
import vn.dnahoangnguyen.api.support.TestAuth;

/** The admin edits the storefront's hotline, Zalo, Facebook, WhatsApp, WeChat, email and address; the public settings follow. */
class ContactSettingsIT extends IntegrationTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    AppUserRepository users;
    @Autowired
    PasswordEncoder encoder;
    @Autowired
    JdbcTemplate jdbc;

    private List<Map<String, Object>> saved;
    private AppUser manager;

    @BeforeEach
    void remember() {
        // other tests read the seeded contact values, so every test puts them back
        saved = jdbc.queryForList("select key, value::text as value from app_setting where key in ('company','site.hotline','site.zalo','site.facebook','site.whatsapp','site.wechat')");
        manager = TestAuth.createUser(users, encoder, "contact-" + System.nanoTime(), "a long enough password", Role.MANAGER);
    }

    @AfterEach
    void restore() {
        if (saved == null) {
            return;
        }
        jdbc.update("delete from app_setting where key in ('company','site.hotline','site.zalo','site.facebook','site.whatsapp','site.wechat')");
        for (Map<String, Object> row : saved) {
            jdbc.update("insert into app_setting (key, value, updated_by) values (?, ?::jsonb, 'test')", row.get("key"), row.get("value"));
        }
    }

    private ResultActions save(AppUser user, String hotline, String zalo, String facebook) throws Exception {
        return save(user, hotline, zalo, facebook, "", "");
    }

    private ResultActions save(AppUser user, String hotline, String zalo, String facebook, String whatsapp, String wechat)
            throws Exception {
        String body = """
                {"hotline":"%s","zalo":"%s","facebook":"%s","whatsapp":"%s","wechat":"%s","email":"lienhe@tinphatdecor.com","address":"Cầu chợ Trâu, Hải Hưng, Ninh Bình"}
                """.formatted(hotline, zalo, facebook, whatsapp, wechat);
        return mvc.perform(put("/api/admin/settings/contact").with(TestAuth.as(user)).with(TestAuth.xsrf(AdminLogin.XSRF))
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    void aManagerChangesTheContactDetailsAndTheStorefrontShowsThem() throws Exception {
        save(manager, "0988 123 456", "https://zalo.me/g/tinphat", "https://www.facebook.com/tinphatdecor")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hotline").value("0988 123 456"));

        mvc.perform(get("/api/public/settings"))
                .andExpect(jsonPath("$.hotline").value("0988 123 456"))
                .andExpect(jsonPath("$.zalo").value("https://zalo.me/g/tinphat"))
                .andExpect(jsonPath("$.facebook").value("https://www.facebook.com/tinphatdecor"))
                .andExpect(jsonPath("$.company.phone").value("0988 123 456"))
                .andExpect(jsonPath("$.company.email").value("lienhe@tinphatdecor.com"))
                .andExpect(jsonPath("$.company.name").value("CÔNG TY TNHH SẢN XUẤT TÍN PHÁT"));
        mvc.perform(get("/api/admin/settings/contact").with(TestAuth.as(manager)))
                .andExpect(jsonPath("$.zalo").value("https://zalo.me/g/tinphat"))
                .andExpect(jsonPath("$.address").value("Cầu chợ Trâu, Hải Hưng, Ninh Bình"));
    }

    @Test
    void zaloMayBeANumberAndBothLinksMayBeEmpty() throws Exception {
        save(manager, "0914794472", "0914 794 472", "").andExpect(status().isOk());
        mvc.perform(get("/api/public/settings"))
                .andExpect(jsonPath("$.zalo").value("0914 794 472"))
                .andExpect(jsonPath("$.facebook").doesNotExist());

        save(manager, "0914794472", "", "").andExpect(status().isOk());
        mvc.perform(get("/api/public/settings")).andExpect(jsonPath("$.zalo").doesNotExist());
    }

    @Test
    void whatsAppAndWeChatAreSavedShownAndMayBeEmpty() throws Exception {
        save(manager, "0914794472", "", "", "+84 914 794 472", "tinphat_decor").andExpect(status().isOk())
                .andExpect(jsonPath("$.whatsapp").value("+84 914 794 472"))
                .andExpect(jsonPath("$.wechat").value("tinphat_decor"));
        mvc.perform(get("/api/public/settings"))
                .andExpect(jsonPath("$.whatsapp").value("+84 914 794 472"))
                .andExpect(jsonPath("$.wechat").value("tinphat_decor"));
        mvc.perform(get("/api/admin/settings/contact").with(TestAuth.as(manager)))
                .andExpect(jsonPath("$.whatsapp").value("+84 914 794 472"))
                .andExpect(jsonPath("$.wechat").value("tinphat_decor"));

        // a wa.me link, and a WeChat account found by its phone number
        save(manager, "0914794472", "", "", "https://wa.me/84914794472", "0914 794 472").andExpect(status().isOk());
        mvc.perform(get("/api/public/settings"))
                .andExpect(jsonPath("$.whatsapp").value("https://wa.me/84914794472"))
                .andExpect(jsonPath("$.wechat").value("0914 794 472"));

        save(manager, "0914794472", "", "", "", "").andExpect(status().isOk());
        mvc.perform(get("/api/public/settings"))
                .andExpect(jsonPath("$.whatsapp").doesNotExist())
                .andExpect(jsonPath("$.wechat").doesNotExist());
    }

    @Test
    void wrongWhatsAppAndWeChatValuesAreRefusedWithAReason() throws Exception {
        save(manager, "0914794472", "", "", "abc", "").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Số WhatsApp không hợp lệ. Ví dụ: +84 914 794 472."));
        save(manager, "0914794472", "", "", "https://wa.me.evil.example/84914794472", "").andExpect(status().isBadRequest());
        save(manager, "0914794472", "", "", "http://wa.me/84914794472", "").andExpect(status().isBadRequest());
        save(manager, "0914794472", "", "", "", "1abcdef").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(startsWith("WeChat ID gồm 6–20 ký tự")));
        save(manager, "0914794472", "", "", "", "abc").andExpect(status().isBadRequest());
        save(manager, "0914794472", "", "", "", "<script>").andExpect(status().isBadRequest());
        mvc.perform(get("/api/public/settings")).andExpect(jsonPath("$.wechat").doesNotExist());
    }

    @Test
    void wrongNumbersAndLinksAreRefusedWithAReason() throws Exception {
        save(manager, "abc", "", "").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Số hotline không hợp lệ. Ví dụ: 0914 794 472."));
        save(manager, "0914794472", "https://evil.example/zalo.me", "").andExpect(status().isBadRequest());
        save(manager, "0914794472", "http://zalo.me/0914794472", "").andExpect(status().isBadRequest());
        save(manager, "0914794472", "", "https://facebook.com.evil.example/x").andExpect(status().isBadRequest());
        save(manager, "0914794472", "", "javascript:alert(1)").andExpect(status().isBadRequest());
        save(manager, "0914794472", "", "https://www.facebook.com/").andExpect(status().isBadRequest());
        mvc.perform(get("/api/public/settings")).andExpect(jsonPath("$.hotline").value("0914 794 472"));
    }

    @Test
    void onlyAManagerReadsOrChangesThem() throws Exception {
        AppUser editor = TestAuth.createUser(users, encoder, "contact-editor-" + System.nanoTime(), "a long enough password", Role.EDITOR);
        mvc.perform(get("/api/admin/settings/contact").with(TestAuth.as(editor))).andExpect(status().isForbidden());
        save(editor, "0988123456", "", "").andExpect(status().isForbidden());
        mvc.perform(put("/api/admin/settings/contact").with(TestAuth.xsrf(AdminLogin.XSRF))
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/public/settings")).andExpect(jsonPath("$.hotline").value("0914 794 472"));
    }
}
