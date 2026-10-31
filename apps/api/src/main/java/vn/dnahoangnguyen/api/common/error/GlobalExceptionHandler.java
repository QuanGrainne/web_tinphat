package vn.dnahoangnguyen.api.common.error;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import vn.dnahoangnguyen.api.common.error.Problems.FieldViolation;

/** Turns every failure into the single {@code application/problem+json} shape with a Vietnamese detail. */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private static final String SQL_STATE_UNIQUE = "23505";
    private static final String SQL_STATE_FOREIGN_KEY = "23503";

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<Object> handleDomain(DomainException ex, HttpServletRequest request) {
        HttpHeaders headers = new HttpHeaders();
        if (ex.retryAfter() != null) {
            headers.set(HttpHeaders.RETRY_AFTER, String.valueOf(Math.max(1, ex.retryAfter().toSeconds())));
        }
        return build(ex.status(), ex.code(), ex.detailVi(), request.getRequestURI(), null, ex.extensions(), headers);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<Object> handleOptimisticLock(OptimisticLockingFailureException ex,
                                                       HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, ProblemCode.VERSION_CONFLICT, Problems.DETAIL_VERSION_CONFLICT,
                request.getRequestURI(), null, null, null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Object> handleIntegrity(DataIntegrityViolationException ex, HttpServletRequest request) {
        String sqlState = sqlState(ex);
        if (SQL_STATE_UNIQUE.equals(sqlState)) {
            return build(HttpStatus.CONFLICT, ProblemCode.DUPLICATE, Problems.DETAIL_DUPLICATE,
                    request.getRequestURI(), null, null, null);
        }
        if (SQL_STATE_FOREIGN_KEY.equals(sqlState)) {
            return build(HttpStatus.CONFLICT, ProblemCode.CONFLICT_STATE, Problems.DETAIL_CONFLICT_STATE,
                    request.getRequestURI(), null, null, null);
        }
        log.error("Unmapped integrity violation (sqlState={}) on {}", sqlState, request.getRequestURI(), ex);
        return internal(request.getRequestURI());
    }

    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public ResponseEntity<Object> handleConstraintViolation(jakarta.validation.ConstraintViolationException ex,
                                                            HttpServletRequest request) {
        List<FieldViolation> errors = new ArrayList<>();
        for (ConstraintViolation<?> v : ex.getConstraintViolations()) {
            String path = v.getPropertyPath().toString();
            errors.add(new FieldViolation(path.substring(path.lastIndexOf('.') + 1), v.getMessage()));
        }
        return build(HttpStatus.BAD_REQUEST, ProblemCode.VALIDATION_FAILED, Problems.DETAIL_VALIDATION,
                request.getRequestURI(), errors, null, null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Object> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth instanceof AnonymousAuthenticationToken) {
            return build(HttpStatus.UNAUTHORIZED, ProblemCode.UNAUTHENTICATED, Problems.DETAIL_UNAUTHENTICATED,
                    request.getRequestURI(), null, null, null);
        }
        return build(HttpStatus.FORBIDDEN, ProblemCode.FORBIDDEN, Problems.DETAIL_FORBIDDEN,
                request.getRequestURI(), null, null, null);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Object> handleAuthentication(AuthenticationException ex, HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, ProblemCode.UNAUTHENTICATED, Problems.DETAIL_UNAUTHENTICATED,
                request.getRequestURI(), null, null, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleAny(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception on {} {}", request.getMethod(), request.getRequestURI(), ex);
        return internal(request.getRequestURI());
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
                                                                  HttpHeaders headers, HttpStatusCode status,
                                                                  WebRequest request) {
        List<FieldViolation> errors = new ArrayList<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            errors.add(new FieldViolation(fe.getField(), message(fe)));
        }
        for (ObjectError oe : ex.getBindingResult().getGlobalErrors()) {
            errors.add(new FieldViolation(oe.getObjectName(), message(oe)));
        }
        return build(HttpStatus.BAD_REQUEST, ProblemCode.VALIDATION_FAILED, Problems.DETAIL_VALIDATION,
                path(request), errors, null, null);
    }

    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(HandlerMethodValidationException ex,
                                                                            HttpHeaders headers,
                                                                            HttpStatusCode status,
                                                                            WebRequest request) {
        List<FieldViolation> errors = new ArrayList<>();
        ex.getParameterValidationResults().forEach(result -> {
            String field = result.getMethodParameter().getParameterName();
            for (MessageSourceResolvable error : result.getResolvableErrors()) {
                errors.add(new FieldViolation(field == null ? "parameter" : field, message(error)));
            }
        });
        return build(HttpStatus.BAD_REQUEST, ProblemCode.VALIDATION_FAILED, Problems.DETAIL_VALIDATION,
                path(request), errors, null, null);
    }

    /** Framework-raised errors (bad JSON, wrong method, unknown path...) keep their status but use our body. */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body, HttpHeaders headers,
                                                             HttpStatusCode statusCode, WebRequest request) {
        HttpStatus status = HttpStatus.resolve(statusCode.value());
        if (status == null) {
            status = statusCode.is4xxClientError() ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR;
        }
        if (status.is5xxServerError()) {
            log.error("Framework error {} on {}", status.value(), path(request), ex);
            return build(status, ProblemCode.INTERNAL, Problems.DETAIL_INTERNAL, path(request), null, null, headers);
        }
        ProblemCode code = status == HttpStatus.NOT_FOUND ? ProblemCode.NOT_FOUND : ProblemCode.VALIDATION_FAILED;
        String detail = switch (status) {
            case NOT_FOUND -> Problems.DETAIL_NOT_FOUND;
            case METHOD_NOT_ALLOWED -> "Phương thức yêu cầu không được hỗ trợ.";
            case NOT_ACCEPTABLE, UNSUPPORTED_MEDIA_TYPE -> "Định dạng dữ liệu không được hỗ trợ.";
            default -> Problems.DETAIL_VALIDATION;
        };
        return build(status, code, detail, path(request), null, null, headers);
    }

    private ResponseEntity<Object> internal(String instance) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, ProblemCode.INTERNAL, Problems.DETAIL_INTERNAL, instance,
                null, null, null);
    }

    private static ResponseEntity<Object> build(HttpStatus status, ProblemCode code, String detailVi,
                                                String instance, List<FieldViolation> errors,
                                                Map<String, Object> extensions, HttpHeaders extraHeaders) {
        ResponseEntity.BodyBuilder builder = ResponseEntity.status(status).contentType(MediaType.APPLICATION_PROBLEM_JSON);
        if (extraHeaders != null) {
            // Retry-After / Allow / Accept are meaningful to clients; content headers are set above
            for (String name : List.of(HttpHeaders.RETRY_AFTER, HttpHeaders.ALLOW, HttpHeaders.ACCEPT)) {
                List<String> values = extraHeaders.get(name);
                if (values != null) {
                    builder.header(name, values.toArray(String[]::new));
                }
            }
        }
        return builder.body(Problems.body(status, code, detailVi, instance, errors, extensions));
    }

    private static String path(WebRequest request) {
        return request instanceof ServletWebRequest swr ? swr.getRequest().getRequestURI() : null;
    }

    private static String message(MessageSourceResolvable error) {
        String message = error.getDefaultMessage();
        return message == null ? "Giá trị không hợp lệ." : message;
    }

    /** SQLState of the first JDBC exception in the cause chain, or {@code null}. */
    static String sqlState(Throwable throwable) {
        for (Throwable t = throwable; t != null; t = t.getCause() == t ? null : t.getCause()) {
            if (t instanceof SQLException sql && sql.getSQLState() != null) {
                return sql.getSQLState();
            }
        }
        return null;
    }
}
