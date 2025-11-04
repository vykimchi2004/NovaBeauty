package com.nova_beauty.backend.service;

import java.text.ParseException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.StringJoiner;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import com.nova_beauty.backend.dto.request.AuthenticationRequest;
import com.nova_beauty.backend.dto.request.IntrospectRequest;
import com.nova_beauty.backend.dto.request.LogoutRequest;
import com.nova_beauty.backend.dto.request.RefreshRequest;
import com.nova_beauty.backend.dto.response.AuthenticationResponse;
import com.nova_beauty.backend.dto.response.IntrospectResponse;
import com.nova_beauty.backend.entity.InvalidatedToken;
import com.nova_beauty.backend.entity.Role;
import com.nova_beauty.backend.entity.User;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.repository.InvalidatedTokenRepository;
import com.nova_beauty.backend.repository.UserRepository;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationService {
    UserRepository userRepository;
    InvalidatedTokenRepository invalidatedRepository;

    @NonFinal
    @Value("${jwt.signerKey}")
    protected String SIGNER_KEY;

    @NonFinal
    @Value("${jwt.valid-duration}")
    protected long VALID_DURATION;

    @NonFinal
    @Value("${jwt.refreshable-duration}")
    protected long REFRESHABLE_DURATION;

    // Kiểm tra token
    public IntrospectResponse introspect(IntrospectRequest request) throws JOSEException, ParseException {
        var token = request.getToken();

        boolean isValid = true;

        // spotless:off
        try {
            verifyToken(token, false);
        } catch (AppException e) {
            isValid = false;
        }
        // spotless:on

        return IntrospectResponse.builder().valid(isValid).build();
    }

    // Verify email, password request vs repository
    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        log.info("SignKey: {}", SIGNER_KEY);

        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);
        var user = userRepository
                .findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        boolean authenticated = passwordEncoder.matches(request.getPassword(), user.getPassword());

        if (!authenticated) throw new AppException(ErrorCode.UNAUTHENTICATED);

        var token = generateToken(user);

        return AuthenticationResponse.builder().token(token).authenticated(true).build();
    }

    public void logout(LogoutRequest request) throws ParseException, JOSEException {
        try {
            var signToken = verifyToken(request.getToken(), true);

            String jit = signToken.getJWTClaimsSet().getJWTID();
            Date expiryTime = signToken.getJWTClaimsSet().getExpirationTime(); // Thời điểm hết hạn để refresh token

            InvalidatedToken invalidatedToken =
                    InvalidatedToken.builder().id(jit).expiryTime(expiryTime).build();
            // Use upsert to avoid duplicate key on concurrent/logout retries
            invalidatedRepository.saveOrUpdate(jit, expiryTime);
        } catch (AppException ex) {
            log.info("Token already expired");
        }
    }

    private SignedJWT verifyToken(String token, boolean isRefresh) throws JOSEException, ParseException {
        JWSVerifier verifier = new MACVerifier(SIGNER_KEY.getBytes()); // Create format verify token by signer_key

        SignedJWT signedJWT = SignedJWT.parse(token); // token: String -> SignedJWT

        var verified = signedJWT.verify(verifier); // verify token

        // Thời điểm hết hạn
        Date expiryTime = (isRefresh)
                ? new Date(signedJWT
                .getJWTClaimsSet()
                .getIssueTime()
                .toInstant()
                .plus(REFRESHABLE_DURATION, ChronoUnit.SECONDS)
                .toEpochMilli()) // thời điểm cần login lại
                : signedJWT.getJWTClaimsSet().getExpirationTime(); // Thời điểm refresh tiếp theo

        // Kiểm tra hết hạn token
        if (!(verified && expiryTime.after(new Date()))) throw new AppException(ErrorCode.UNAUTHENTICATED);

        // Kiểm tra token tồn tại trong trong invalidatedRepository
        if (invalidatedRepository.existsById(signedJWT.getJWTClaimsSet().getJWTID()))
            throw new AppException(ErrorCode.UNAUTHENTICATED);

        return signedJWT;
    }

    // Đảm bảo token không được quá 4 KB
    private String generateToken(User user) {
        // header
        JWSHeader header = new JWSHeader(JWSAlgorithm.HS512); // Sử dụng thuật toán HS512

        // payload = nhieu claim
        JWTClaimsSet jwtClaimSet = new JWTClaimsSet.Builder()
                .subject(user.getEmail()) // user đăng nhập là ai
                .issuer("lumina_book.com") // Định danh ai là người issuer này được issuer từ ai, thường là issue
                .issueTime(new Date()) // Thời điểm lần đầu login
                .expirationTime(
                        new Date( // Thời điểm hết hạn token
                                Instant.now()
                                        .plus(VALID_DURATION, ChronoUnit.SECONDS)
                                        .toEpochMilli()))
                .jwtID(UUID.randomUUID().toString())
                .claim("scope", buildScope(user))
                .build();

        Payload payload = new Payload(jwtClaimSet.toJSONObject());

        JWSObject jwsObject = new JWSObject(header, payload);

        // Ký token
        // Dùng 1 key 32 bit làm khóa (key random trên mạng)
        try {
            jwsObject.sign(new MACSigner(
                    SIGNER_KEY.getBytes())); // symmetric signer: khóa bí mật để ký và khóa giải mãi cùng 1 khóa
            return jwsObject.serialize(); // Biến đối tượng JWSObject thành chuỗi String token (thường ở dạng
            // header.payload.signature, base64-encoded).
        } catch (JOSEException e) {
            log.error("Cannot create token", e);
            throw new RuntimeException(e);
        }
    }

    public AuthenticationResponse refreshToken(RefreshRequest request) throws ParseException, JOSEException {
        // Kiểm tra hiệu lực token
        var signJWT = verifyToken(request.getToken(), true);

        var jit = signJWT.getJWTClaimsSet().getJWTID();
        var expiryTime = signJWT.getJWTClaimsSet().getExpirationTime();

        InvalidatedToken invalidatedToken =
                InvalidatedToken.builder().id(jit).expiryTime(expiryTime).build();

        // Idempotent insert to handle concurrent refresh requests
        invalidatedRepository.saveOrUpdate(jit, expiryTime);

        var email = signJWT.getJWTClaimsSet().getSubject();

        var user = userRepository.findByEmail(email).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        var token = generateToken(user);

        return AuthenticationResponse.builder().token(token).authenticated(true).build();
    }

    private String buildScope(User user) {
        StringJoiner stringJoiner = new StringJoiner(" ");

        if (user.getRole() != null) {
            Role role = user.getRole();
            stringJoiner.add("ROLE_" + role.getName());
            if (!CollectionUtils.isEmpty(role.getPermissions()))
                role.getPermissions().forEach(permission -> stringJoiner.add(permission.getName()));
        }
        ;

        return stringJoiner.toString();
    }
}