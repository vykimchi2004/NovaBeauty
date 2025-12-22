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

import java.time.LocalDate;

import com.nova_beauty.backend.dto.request.AuthenticationRequest;
import com.nova_beauty.backend.dto.request.GoogleLoginRequest;
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
import com.nova_beauty.backend.repository.RoleRepository;
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

    /**
     * Helper method để tìm user theo email, xử lý trường hợp duplicate email
     * Nếu có duplicate, lấy user mới nhất (createAt DESC)
     */
    private java.util.Optional<User> findUserByEmailSafe(String email) {
        try {
            return userRepository.findByEmail(email);
        } catch (org.springframework.dao.IncorrectResultSizeDataAccessException e) {
            // Nếu có duplicate email, lấy user mới nhất
            log.warn("Duplicate email found: {}, using findFirstByEmailOrderByCreateAtDesc", email);
            return userRepository.findFirstByEmailOrderByCreateAtDesc(email);
        }
    }

    // Verify email, password request vs repository
    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);
        
        // Xử lý trường hợp duplicate email: lấy user đầu tiên (hoặc mới nhất)
        User user = findUserByEmailSafe(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (!user.isActive()) {
            throw new AppException(ErrorCode.ACCOUNT_LOCKED);
        }

        boolean authenticated = passwordEncoder.matches(request.getPassword(), user.getPassword());

        if (!authenticated) throw new AppException(ErrorCode.UNAUTHENTICATED);

        // Tạo access token (ngắn hạn) và refresh token (dài hạn)
        var accessToken = generateAccessToken(user);
        var refreshToken = generateRefreshToken(user);

        return AuthenticationResponse.builder()
                .token(accessToken)
                .refreshToken(refreshToken)
                .authenticated(true)
                .build();
    }

    public void logout(LogoutRequest request) throws ParseException, JOSEException {
        try {
            var signToken = verifyToken(request.getToken(), true);

            String jit = signToken.getJWTClaimsSet().getJWTID();
            Date expiryTime = signToken.getJWTClaimsSet().getExpirationTime();

            // Use upsert to avoid duplicate key on concurrent/logout retries
            invalidatedRepository.saveOrUpdate(jit, expiryTime);
        } catch (AppException ex) {
            log.info("Token already expired");
        }
    }

    private SignedJWT verifyToken(String token, boolean isRefresh) throws JOSEException, ParseException {
        JWSVerifier verifier = new MACVerifier(getSignerKeyBytes());

        SignedJWT signedJWT = SignedJWT.parse(token);

        var verified = signedJWT.verify(verifier);

        // Lấy thời điểm hết hạn
        Date expiryTime = signedJWT.getJWTClaimsSet().getExpirationTime();

        // Kiểm tra hết hạn token
        if (!(verified && expiryTime.after(new Date()))) throw new AppException(ErrorCode.UNAUTHENTICATED);

        // Kiểm tra token tồn tại trong invalidatedRepository
        if (invalidatedRepository.existsById(signedJWT.getJWTClaimsSet().getJWTID()))
            throw new AppException(ErrorCode.UNAUTHENTICATED);

        return signedJWT;
    }

    // Tạo Access Token (ngắn hạn - dùng cho API calls)
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

    // Tạo Refresh Token (dài hạn - chỉ dùng để lấy access token mới)
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

    public AuthenticationResponse refreshToken(RefreshRequest request) throws ParseException, JOSEException {
        // Verify refresh token
        var signJWT = verifyToken(request.getToken(), true);

        var jit = signJWT.getJWTClaimsSet().getJWTID();
        var expiryTime = signJWT.getJWTClaimsSet().getExpirationTime();

        // Invalidate old refresh token
        invalidatedRepository.saveOrUpdate(jit, expiryTime);

        var email = signJWT.getJWTClaimsSet().getSubject();
        var user = findUserByEmailSafe(email).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // Tạo cặp token mới
        var accessToken = generateAccessToken(user);
        var newRefreshToken = generateRefreshToken(user);

        return AuthenticationResponse.builder()
                .token(accessToken)
                .refreshToken(newRefreshToken)
                .authenticated(true)
                .build();
    }

    // Google OAuth login
    public AuthenticationResponse authenticateWithGoogle(GoogleLoginRequest request) {
        if (request.getEmail() == null || request.getEmail().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_KEY, "Email từ Google không hợp lệ");
        }

        String email = request.getEmail().toLowerCase().trim();
        
        // Tìm user theo email (xử lý duplicate email)
        User user = findUserByEmailSafe(email).orElse(null);

        // Nếu user chưa tồn tại, tạo tài khoản mới
        if (user == null) {
            log.info("Creating new user from Google login: {}", email);
            
            // Lấy role CUSTOMER mặc định
            Role customerRole = roleRepository.findById("CUSTOMER")
                    .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Không tìm thấy role CUSTOMER"));
            
            // Tạo user mới
            user = User.builder()
                    .email(email)
                    .fullName(request.getFullName() != null ? request.getFullName() : email.split("@")[0])
                    .password("") // Google login không cần password
                    .isActive(true) // Tự động kích hoạt
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
            // User đã tồn tại, kiểm tra trạng thái
            if (!user.isActive()) {
                throw new AppException(ErrorCode.ACCOUNT_LOCKED);
            }
            log.info("Existing user logging in with Google: {}", email);
        }

        // Tạo access token và refresh token
        var accessToken = generateAccessToken(user);
        var refreshToken = generateRefreshToken(user);

        return AuthenticationResponse.builder()
                .token(accessToken)
                .refreshToken(refreshToken)
                .authenticated(true)
                .build();
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
