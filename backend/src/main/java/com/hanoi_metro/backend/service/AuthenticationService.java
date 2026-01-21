package com.hanoi_metro.backend.service;

import java.text.ParseException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.StringJoiner;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import com.hanoi_metro.backend.dto.request.AuthenticationRequest;
import com.hanoi_metro.backend.dto.request.GoogleLoginRequest;
import com.hanoi_metro.backend.dto.request.IntrospectRequest;
import com.hanoi_metro.backend.dto.request.LogoutRequest;
import com.hanoi_metro.backend.dto.request.RefreshRequest;
import com.hanoi_metro.backend.dto.response.AuthenticationResponse;
import com.hanoi_metro.backend.dto.response.IntrospectResponse;
import com.hanoi_metro.backend.entity.Role;
import com.hanoi_metro.backend.entity.User;
import com.hanoi_metro.backend.exception.AppException;
import com.hanoi_metro.backend.exception.ErrorCode;
import com.hanoi_metro.backend.repository.InvalidatedTokenRepository;
import com.hanoi_metro.backend.repository.RoleRepository;
import com.hanoi_metro.backend.repository.UserRepository;
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
    RoleRepository roleRepository;

    @NonFinal
    @Value("${jwt.signerKey}")
    protected String SIGNER_KEY;

    @NonFinal
    @Value("${jwt.valid-duration}")
    protected long VALID_DURATION;

    @NonFinal
    @Value("${jwt.refreshable-duration}")
    protected long REFRESHABLE_DURATION;

    // =========================
    // INTROSPECT
    // =========================
    public IntrospectResponse introspect(IntrospectRequest request) throws JOSEException, ParseException {
        var token = request.getToken();
        boolean isValid = true;

        try {
            verifyToken(token, false); // access token
        } catch (AppException e) {
            isValid = false;
        }

        return IntrospectResponse.builder()
                .valid(isValid)
                .build();
    }

    /**
     * Helper method để tìm user theo email, xử lý trường hợp duplicate email
     * Nếu có duplicate, lấy user mới nhất (createAt DESC)
     */
    private java.util.Optional<User> findUserByEmailSafe(String email) {
        try {
            return userRepository.findByEmail(email);
        } catch (IncorrectResultSizeDataAccessException e) {
            log.warn("Duplicate email found: {}, using findFirstByEmailOrderByCreateAtDesc", email);
            return userRepository.findFirstByEmailOrderByCreateAtDesc(email);
        }
    }

    // =========================
    // LOGIN EMAIL/PASSWORD
    // =========================
    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);

        User user = findUserByEmailSafe(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (!user.isActive()) {
            throw new AppException(ErrorCode.ACCOUNT_LOCKED);
        }

        boolean authenticated = passwordEncoder.matches(request.getPassword(), user.getPassword());
        if (!authenticated) throw new AppException(ErrorCode.UNAUTHENTICATED);

        var accessToken = generateAccessToken(user);
        var refreshToken = generateRefreshToken(user);

        return AuthenticationResponse.builder()
                .token(accessToken)
                .refreshToken(refreshToken)
                .authenticated(true)
                .build();
    }

    // =========================
    // LOGOUT
    // =========================
    public void logout(LogoutRequest request) throws ParseException, JOSEException {
        try {
            var signToken = verifyToken(request.getToken(), false); // access token logout
            String jit = signToken.getJWTClaimsSet().getJWTID();
            Date expiryTime = signToken.getJWTClaimsSet().getExpirationTime();

            invalidatedRepository.saveOrUpdate(jit, expiryTime);
        } catch (AppException ex) {
            log.info("Token already expired or invalid");
        }
    }

    // =========================
    // REFRESH TOKEN
    // =========================
    public AuthenticationResponse refreshToken(RefreshRequest request) throws ParseException, JOSEException {
        // verify refresh token
        var signJWT = verifyToken(request.getToken(), true);

        var jit = signJWT.getJWTClaimsSet().getJWTID();
        var expiryTime = signJWT.getJWTClaimsSet().getExpirationTime();

        // invalidate old refresh token
        invalidatedRepository.saveOrUpdate(jit, expiryTime);

        var email = signJWT.getJWTClaimsSet().getSubject();
        var user = findUserByEmailSafe(email).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // create new pair
        var accessToken = generateAccessToken(user);
        var newRefreshToken = generateRefreshToken(user);

        return AuthenticationResponse.builder()
                .token(accessToken)
                .refreshToken(newRefreshToken)
                .authenticated(true)
                .build();
    }

    // =========================
    // GOOGLE LOGIN
    // =========================
    public AuthenticationResponse authenticateWithGoogle(GoogleLoginRequest request) {
        if (request.getEmail() == null || request.getEmail().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_KEY, "Email từ Google không hợp lệ");
        }

        String email = request.getEmail().toLowerCase().trim();
        User user = findUserByEmailSafe(email).orElse(null);

        if (user == null) {
            log.info("Creating new user from Google login: {}", email);

            Role customerRole = roleRepository.findById("CUSTOMER")
                    .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Không tìm thấy role CUSTOMER"));

            user = User.builder()
                    .email(email)
                    .fullName(request.getFullName() != null ? request.getFullName() : email.split("@")[0])
                    .password("")
                    .isActive(true)
                    .createAt(LocalDate.now())
                    .role(customerRole)
                    .phoneNumber("")
                    .address("")
                    .build();

            try {
                user = userRepository.save(user);
                log.info("Created new user from Google: {}", user.getId());
            } catch (Exception e) {
                log.error("Error creating user from Google login", e);
                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Không thể tạo tài khoản từ Google");
            }
        } else {
            if (!user.isActive()) {
                throw new AppException(ErrorCode.ACCOUNT_LOCKED);
            }
            log.info("Existing user logging in with Google: {}", email);
        }

        var accessToken = generateAccessToken(user);
        var refreshToken = generateRefreshToken(user);

        return AuthenticationResponse.builder()
                .token(accessToken)
                .refreshToken(refreshToken)
                .authenticated(true)
                .build();
    }

    // =========================
    // VERIFY TOKEN (CORE)
    // =========================
    private SignedJWT verifyToken(String token, boolean isRefresh) throws JOSEException, ParseException {
        JWSVerifier verifier = new MACVerifier(getSignerKeyBytes());
        SignedJWT signedJWT = SignedJWT.parse(token);

        boolean verified = signedJWT.verify(verifier);
        Date expiryTime = signedJWT.getJWTClaimsSet().getExpirationTime();

        // signature + expiry
        if (!(verified && expiryTime.after(new Date()))) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        // invalidated token
        String jti = signedJWT.getJWTClaimsSet().getJWTID();
        if (invalidatedRepository.existsById(jti)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        // token type check (access vs refresh)
        Object typeObj = signedJWT.getJWTClaimsSet().getClaim("type");
        String type = typeObj == null ? "" : typeObj.toString();

        if (isRefresh) {
            if (!"refresh".equals(type)) throw new AppException(ErrorCode.UNAUTHENTICATED);
        } else {
            if (!"access".equals(type)) throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        // check user active
        String email = signedJWT.getJWTClaimsSet().getSubject();
        User user = findUserByEmailSafe(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (!user.isActive()) {
            throw new AppException(ErrorCode.ACCOUNT_LOCKED);
        }

        return signedJWT;
    }

    // =========================
    // TOKEN GENERATION
    // =========================
    private String generateAccessToken(User user) {
        JWSHeader header = new JWSHeader(JWSAlgorithm.HS512);

        JWTClaimsSet jwtClaimSet = new JWTClaimsSet.Builder()
                .subject(user.getEmail())
                .issuer("nova_beauty.com")
                .issueTime(new Date())
                .expirationTime(new Date(Instant.now()
                        .plus(VALID_DURATION, ChronoUnit.SECONDS)
                        .toEpochMilli()))
                .jwtID(UUID.randomUUID().toString())
                .claim("scope", buildScope(user))
                .claim("type", "access")
                .build();

        Payload payload = new Payload(jwtClaimSet.toJSONObject());
        JWSObject jwsObject = new JWSObject(header, payload);

        try {
            jwsObject.sign(new MACSigner(getSignerKeyBytes()));
            return jwsObject.serialize();
        } catch (JOSEException e) {
            log.error("Cannot create access token", e);
            throw new RuntimeException(e);
        }
    }

    private String generateRefreshToken(User user) {
        JWSHeader header = new JWSHeader(JWSAlgorithm.HS512);

        JWTClaimsSet jwtClaimSet = new JWTClaimsSet.Builder()
                .subject(user.getEmail())
                .issuer("nova_beauty.com")
                .issueTime(new Date())
                .expirationTime(new Date(Instant.now()
                        .plus(REFRESHABLE_DURATION, ChronoUnit.SECONDS)
                        .toEpochMilli()))
                .jwtID(UUID.randomUUID().toString())
                .claim("type", "refresh")
                .build();

        Payload payload = new Payload(jwtClaimSet.toJSONObject());
        JWSObject jwsObject = new JWSObject(header, payload);

        try {
            jwsObject.sign(new MACSigner(getSignerKeyBytes()));
            return jwsObject.serialize();
        } catch (JOSEException e) {
            log.error("Cannot create refresh token", e);
            throw new RuntimeException(e);
        }
    }

    private byte[] getSignerKeyBytes() {
        String sanitized = (SIGNER_KEY == null) ? "" : SIGNER_KEY.replaceAll("\\s", "");
        return sanitized.getBytes();
    }

    private String buildScope(User user) {
        StringJoiner stringJoiner = new StringJoiner(" ");
        if (user.getRole() != null) {
            Role role = user.getRole();
            stringJoiner.add(role.getName());
            if (!CollectionUtils.isEmpty(role.getPermissions()))
                role.getPermissions().forEach(permission -> stringJoiner.add(permission.getName()));
        }
        return stringJoiner.toString();
    }
}
