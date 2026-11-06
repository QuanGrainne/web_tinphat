package vn.dnahoangnguyen.api.catalog.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import vn.dnahoangnguyen.api.common.error.DomainException;

class ImageUploadServiceTest {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0, 1};

    @TempDir
    Path dir;

    private ImageUploadService service() {
        return new ImageUploadService(dir.toString());
    }

    @Test
    void storesAnImageUnderAGeneratedName() {
        String url = service().store(new MockMultipartFile("file", "../../evil.html", "text/html", PNG));

        assertThat(url).matches("/uploads/images/[0-9a-f]{32}\\.png");
        assertThat(dir.resolve(url.substring("/uploads/".length()))).exists();
    }

    @Test
    void refusesContentThatIsNotAnImageWhateverItClaims() {
        byte[] html = "<script>alert(1)</script>".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> service().store(new MockMultipartFile("file", "a.png", "image/png", html)))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void refusesEmptyAndOversizedFiles() {
        byte[] big = new byte[(int) ImageUploadService.MAX_BYTES + 1];
        System.arraycopy(PNG, 0, big, 0, PNG.length);

        assertThatThrownBy(() -> service().store(new MockMultipartFile("file", new byte[0])))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> service().store(new MockMultipartFile("file", "a.png", "image/png", big)))
                .isInstanceOf(DomainException.class);
        assertThat(Files.exists(dir.resolve("images"))).isFalse();
    }

    @Test
    void recognisesJpegAndWebp() {
        assertThat(ImageUploadService.extensionOf(new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0})).isEqualTo("jpg");
        assertThat(ImageUploadService.extensionOf("RIFF0000WEBP".getBytes(StandardCharsets.US_ASCII))).isEqualTo("webp");
        assertThat(ImageUploadService.extensionOf("RIFF0000WAVE".getBytes(StandardCharsets.US_ASCII))).isNull();
    }
}
