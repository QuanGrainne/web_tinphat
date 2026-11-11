package vn.dnahoangnguyen.api.catalog.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import vn.dnahoangnguyen.api.admin.user.Role;
import vn.dnahoangnguyen.api.catalog.CatalogIntegrationTest;
import vn.dnahoangnguyen.api.catalog.category.CategoryService.CategoryCreate;
import vn.dnahoangnguyen.api.catalog.excel.ProductImportService;
import vn.dnahoangnguyen.api.catalog.excel.ProductImportService.ImportResult;
import vn.dnahoangnguyen.api.catalog.product.ProductAdminService;
import vn.dnahoangnguyen.api.support.AdminLogin;
import vn.dnahoangnguyen.api.support.TestAuth;

/** KiotViet pictures are copied onto this server on import, and stored links can be copied later. */
@TestPropertySource(properties = "dna.uploads-dir=target/test-uploads")
class RemoteImageIT extends CatalogIntegrationTest {

    private static final String[] HEADERS = {"Loại hàng", "Nhóm hàng(3 Cấp)", "Mã hàng", "Tên hàng", "Giá bán", "ĐVT",
            "Mã ĐVT Cơ bản", "Thuộc tính", "Hình ảnh (url1,url2...)", "Đang kinh doanh"};
    private static final String KV_A = "https://cdn2-retail-images.kiotviet.vn/2026/10/15/tinphat/a.jpg";
    private static final String KV_B = "https://cdn2-retail-images.kiotviet.vn/2026/10/15/tinphat/b.jpg";
    /** A JPEG signature is all the store checks. */
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 16, 'J', 'F', 'I', 'F', 0, 1, 1, 0};

    @MockitoBean
    ImageDownloader downloader;
    @Autowired
    RemoteImageService remote;
    @Autowired
    ProductImportService imports;
    @Autowired
    ProductAdminService reader;

    @BeforeEach
    void freshCopies() {
        jdbc.update("delete from imported_image");
    }

    private static MockMultipartFile file(String code, String images) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XSSFSheet sheet = workbook.createSheet("Hàng");
            Row header = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                header.createCell(i).setCellValue(HEADERS[i]);
            }
            String[] values = {"Hàng hóa", "", code, "Đèn lồng", "12000", "cái", "", "", images, "1"};
            Row row = sheet.createRow(1);
            for (int c = 0; c < values.length; c++) {
                row.createCell(c).setCellValue(values[c]);
            }
            workbook.write(out);
            return new MockMultipartFile("file", "hang.xlsx", null, out.toByteArray());
        }
    }

    private static Path onDisk(String publicPath) {
        return Path.of("target/test-uploads").resolve(publicPath.substring("/uploads/".length()));
    }

    private long category() {
        return categoryService.create(new CategoryCreate("Trung Thu", null)).id();
    }

    @Test
    void importCopiesKiotVietPicturesOntoThisServerAndReusesTheCopy() throws IOException {
        when(downloader.download(any(URI.class), anyLong())).thenReturn(Optional.of(JPEG));
        long group = category();

        ImportResult result = imports.run(file("K1", KV_A + ", " + KV_B), group, true, true, MANAGER);

        assertThat(result.imagesSaved()).isEqualTo(2);
        assertThat(result.imagesLinked()).isZero();
        var stored = reader.get(jdbc.queryForObject("select product_id from sku where code = 'K1'", Long.class));
        assertThat(stored.imageUrl()).startsWith("/uploads/images/").endsWith(".jpg");
        assertThat(stored.galleryUrls()).singleElement().asString().startsWith("/uploads/images/");
        assertThat(Files.readAllBytes(onDisk(stored.imageUrl()))).isEqualTo(JPEG);

        // the same file again: the copies are reused, nothing is downloaded twice
        imports.run(file("K1", KV_A + ", " + KV_B), group, true, true, MANAGER);
        verify(downloader, times(2)).download(any(URI.class), anyLong());
        assertThat(reader.get(stored.id()).imageUrl()).isEqualTo(stored.imageUrl());
        assertThat(remote.remoteCount()).isZero();
    }

    @Test
    void aPictureThatCannotBeFetchedKeepsItsLinkAndIsCopiedLater() throws IOException {
        when(downloader.download(any(URI.class), anyLong())).thenReturn(Optional.empty());
        long group = category();

        ImportResult result = imports.run(file("K2", KV_A), group, true, true, MANAGER);

        assertThat(result.imagesSaved()).isZero();
        assertThat(result.imagesLinked()).isEqualTo(1);
        long id = jdbc.queryForObject("select product_id from sku where code = 'K2'", Long.class);
        assertThat(reader.get(id).imageUrl()).isEqualTo(KV_A);
        assertThat(remote.remoteCount()).isEqualTo(1);

        when(downloader.download(any(URI.class), anyLong())).thenReturn(Optional.of(JPEG));
        long versionBefore = jdbc.queryForObject("select version from product where id = ?", Long.class, id);
        var report = remote.localizeStored();

        assertThat(report.found()).isEqualTo(1);
        assertThat(report.saved()).isEqualTo(1);
        assertThat(report.failed()).isZero();
        assertThat(reader.get(id).imageUrl()).startsWith("/uploads/images/");
        assertThat(jdbc.queryForObject("select version from product where id = ?", Long.class, id)).isGreaterThan(versionBefore);
        assertThat(remote.remoteCount()).isZero();
    }

    @Test
    void storedCategoryAndGalleryLinksAreCopiedToo() {
        when(downloader.download(any(URI.class), anyLong())).thenReturn(Optional.of(JPEG));
        long group = category();
        jdbc.update("update category set image_url = ? where id = ?", KV_A, group);

        var report = remote.localizeStored();

        assertThat(report.saved()).isEqualTo(1);
        assertThat(jdbc.queryForObject("select image_url from category where id = ?", String.class, group)).startsWith("/uploads/images/");
    }

    @Test
    void onlyHttpsAddressesOnTheAllowedHostsAreFetched() {
        assertThat(remote.allowed("https://kiotviet.vn/a.jpg")).isNotNull();
        assertThat(remote.allowed(KV_A)).isNotNull();
        for (String refused : new String[] {
                "http://cdn2-retail-images.kiotviet.vn/a.jpg",
                "https://169.254.169.254/latest/meta-data",
                "https://kiotviet.vn.example.com/a.jpg",
                "https://example.com/kiotviet.vn/a.jpg",
                "https://user@cdn2-retail-images.kiotviet.vn/a.jpg",
                "https://cdn2-retail-images.kiotviet.vn:8443/a.jpg",
                "https://localhost/a.jpg"}) {
            assertThat(remote.allowed(refused)).as(refused).isNull();
            assertThat(remote.localize(refused)).as(refused).isEmpty();
        }
        verify(downloader, never()).download(any(URI.class), anyLong());
        // a site path is already ours and is returned as it is
        assertThat(remote.localize("/uploads/images/x.jpg")).contains("/uploads/images/x.jpg");
    }

    @Test
    void somethingThatIsNotAPictureIsNotStored() {
        when(downloader.download(any(URI.class), anyLong())).thenReturn(Optional.of("<html>not found</html>".getBytes()));

        assertThat(remote.localize(KV_A)).isEmpty();
        assertThat(jdbc.queryForObject("select count(*) from imported_image", Long.class)).isZero();
    }

    @Test
    void onlyAManagerCopiesStoredLinks() throws Exception {
        when(downloader.download(any(URI.class), anyLong())).thenReturn(Optional.of(JPEG));
        var editor = newUser(Role.EDITOR);
        var manager = newUser(Role.MANAGER);
        String ip = "10.66." + (int) (Math.random() * 250) + "." + (int) (Math.random() * 250);

        var editorSession = AdminLogin.login(mvc, editor.getUsername(), "secret-pass", ip);
        mvc.perform(get("/api/admin/images/remote").session(editorSession)).andExpect(status().isOk()).andExpect(jsonPath("$.count").value(0));
        mvc.perform(post("/api/admin/images/localize").session(editorSession).with(TestAuth.xsrf(AdminLogin.XSRF)))
                .andExpect(status().isForbidden());

        var managerSession = AdminLogin.login(mvc, manager.getUsername(), "secret-pass", ip);
        mvc.perform(post("/api/admin/images/localize").session(managerSession).with(TestAuth.xsrf(AdminLogin.XSRF)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.found").value(0));
        mvc.perform(post("/api/admin/images/localize").with(TestAuth.xsrf(AdminLogin.XSRF))).andExpect(status().isUnauthorized());
    }
}
