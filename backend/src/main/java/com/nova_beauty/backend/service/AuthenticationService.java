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

    // Kiá»ƒm tra token
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
            Date expiryTime = signToken.getJWTClaimsSet().getExpirationTime(); // Thá»i Ä‘iá»ƒm háº¿t háº¡n Ä‘á»ƒ refresh token

            InvalidatedToken invalidatedToken =
                    InvalidatedToken.builder().id(jit).expiryTime(expiryTime).build();
            // Use upsert to avoid duplicate key on concurrent/logout retries
            invalidatedRepository.saveOrUpdate(jit, expiryTime);
        } catch (AppException ex) {
            log.info("Token already expired");
        }
    }

    private SignedJWT verifyToken(String token, boolean isRefresh) throws JOSEException, ParseException {
        JWSVerifier verifier = new MACVerifier(getSignerKeyBytes()); // Create format verify token by signer_key

        SignedJWT signedJWT = SignedJWT.parse(token); // token: String -> SignedJWT

        var verified = signedJWT.verify(verifier); // verify token

        // Thá»i Ä‘iá»ƒm háº¿t háº¡n
        Date expiryTime = (isRefresh)
                ? new Date(signedJWT
                        .getJWTClaimsSet()
                        .getIssueTime()
                        .toInstant()
                        .plus(REFRESHABLE_DURATION, ChronoUnit.SECONDS)
                        .toEpochMilli()) // thá»i Ä‘iá»ƒm cáº§n login láº¡i
                : signedJWT.getJWTClaimsSet().getExpirationTime(); // Thá»i Ä‘iá»ƒm refresh tiáº¿p theo

        // Kiá»ƒm tra háº¿t háº¡n token
        if (!(verified && expiryTime.after(new Date()))) throw new AppException(ErrorCode.UNAUTHENTICATED);

        // Kiá»ƒm tra token tá»“n táº¡i trong trong invalidatedRepository
        if (invalidatedRepository.existsById(signedJWT.getJWTClaimsSet().getJWTID()))
            throw new AppException(ErrorCode.UNAUTHENTICATED);

        return signedJWT;
    }

    // Äáº£m báº£o token khÃ´ng Ä‘Æ°á»£c quÃ¡ 4 KB
    private String generateToken(User user) {
        // header
        JWSHeader header = new JWSHeader(JWSAlgorithm.HS512); // Sá»­ dá»¥ng thuáº­t toÃ¡n HS512

        // payload = nhieu claim
        JWTClaimsSet jwtClaimSet = new JWTClaimsSet.Builder()
                .subject(user.getEmail()) // user Ä‘Äƒng nháº­p lÃ  ai
                .issuer("lumina_book.com") // Äá»‹nh danh ai lÃ  ngÆ°á»i issuer nÃ y Ä‘Æ°á»£c issuer tá»« ai, thÆ°á»ng lÃ  issue
                .issueTime(new Date()) // Thá»i Ä‘iá»ƒm láº§n Ä‘áº§u login
                .expirationTime(
                        new Date( // Thá»i Ä‘iá»ƒm háº¿t háº¡n token
                                Instant.now()
                                        .plus(VALID_DURATION, ChronoUnit.SECONDS)
                                        .toEpochMilli()))
                .jwtID(UUID.randomUUID().toString())
                .claim("scope", buildScope(user))
                .build();

        Payload payload = new Payload(jwtClaimSet.toJSONObject());

        JWSObject jwsObject = new JWSObject(header, payload);

        // KÃ½ token
        // DÃ¹ng 1 key 32 bit lÃ m khÃ³a (key random trÃªn máº¡ng)
        try {
            jwsObject.sign(new MACSigner(
                    getSignerKeyBytes())); // symmetric signer: khÃ³a bÃ­ máº­t Ä‘á»ƒ kÃ½ vÃ  khÃ³a giáº£i mÃ£i cÃ¹ng 1 khÃ³a
            return jwsObject.serialize(); // Biáº¿n Ä‘á»‘i tÆ°á»£ng JWSObject thÃ nh chuá»—i String token (thÆ°á»ng á»Ÿ dáº¡ng
            // header.payload.signature, base64-encoded).
        } catch (JOSEException e) {
            log.error("Cannot create token", e);
            throw new RuntimeException(e);
        }
    }

    private byte[] getSignerKeyBytes() {
        String sanitized = (SIGNER_KEY == null) ? "" : SIGNER_KEY.replaceAll("\\s", "");  // xÃ³a khoáº£ng tráº¯ng
        return sanitized.getBytes();
    }

    public AuthenticationResponse refreshToken(RefreshRequest request) throws ParseException, JOSEException {
        // Kiá»ƒm tra hiá»‡u lá»±c token
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
            // Thêm role name trực tiếp (không có prefix ROLE_) vì SecurityConfig đã set prefix là ""
            stringJoiner.add(role.getName());
            if (!CollectionUtils.isEmpty(role.getPermissions()))
                role.getPermissions().forEach(permission -> stringJoiner.add(permission.getName()));
        }
        ;

        return stringJoiner.toString();
    }
}
