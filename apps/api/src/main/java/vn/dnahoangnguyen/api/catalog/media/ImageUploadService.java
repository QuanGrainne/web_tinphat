package vn.dnahoangnguyen.api.catalog.media;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;

/**
 * Stores admin images in the uploads directory, which the reverse proxy serves under {@code /uploads/}. The type comes
 * from the file's own bytes and the name is generated, so nothing the client sends decides what the server stores.
 */
@Service
public class ImageUploadService {

    static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final int HEADER_BYTES = 12;

    private final Path root;

    public ImageUploadService(@Value("${dna.uploads-dir:uploads}") String uploadsDir) {
        this.root = Path.of(uploadsDir).toAbsolutePath().normalize();
    }

    /** Saves the image and returns its public path, for example {@code /uploads/images/3f2a.jpg}. */
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw invalid("Chưa chọn ảnh.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw invalid("Ảnh tối đa 5 MB.");
        }
        try {
            String extension;
            try (InputStream in = file.getInputStream()) {
                extension = extensionOf(in.readNBytes(HEADER_BYTES));
            }
            if (extension == null) {
                throw invalid("Chỉ nhận ảnh JPG, PNG hoặc WebP.");
            }
            Path directory = root.resolve("images");
            Files.createDirectories(directory);
            String name = UUID.randomUUID().toString().replace("-", "") + "." + extension;
            try (InputStream content = file.getInputStream()) {
                Files.copy(content, directory.resolve(name));
            }
            return "/uploads/images/" + name;
        } catch (IOException e) {
            throw new IllegalStateException("Could not store the uploaded image", e);
        }
    }

    /** File extension for the image signature at the start of the file; null for anything else. */
    static String extensionOf(byte[] header) {
        if (matches(header, 0, 0xFF, 0xD8, 0xFF)) {
            return "jpg";
        }
        if (matches(header, 0, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A)) {
            return "png";
        }
        if (matches(header, 0, 'R', 'I', 'F', 'F') && matches(header, 8, 'W', 'E', 'B', 'P')) {
            return "webp";
        }
        return null;
    }

    private static boolean matches(byte[] data, int offset, int... signature) {
        if (data.length < offset + signature.length) {
            return false;
        }
        byte[] expected = new byte[signature.length];
        for (int i = 0; i < signature.length; i++) {
            expected[i] = (byte) signature[i];
        }
        return Arrays.equals(data, offset, offset + signature.length, expected, 0, signature.length);
    }

    private static DomainException invalid(String detail) {
        return DomainException.badRequest(ProblemCode.VALIDATION_FAILED, detail);
    }
}
