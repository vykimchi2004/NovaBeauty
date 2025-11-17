package com.nova_beauty.backend.configuration;

import java.text.ParseException;
import java.util.Objects;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import com.nova_beauty.backend.dto.request.IntrospectRequest;
import com.nova_beauty.backend.service.AuthenticationService;
import com.nimbusds.jose.JOSEException;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class CustomJwtDecoder implements JwtDecoder {
    @Value("${jwt.signerKey}")
    private String signerKey;

    @Autowired
    private AuthenticationService authenticationService;

    private NimbusJwtDecoder nimbusJwtDecoder = null;

    @Override
    public Jwt decode(String token) throws JwtException {
        if (token == null || token.trim().isEmpty()) {
            log.warn("Attempted to decode null or empty token");
            throw new JwtException("Token is null or empty");
        }

        try {
            // Check token cÃ²n hiá»‡u lá»±c khÃ´ng, náº¿u khÃ´ng -> Exception
            var response = authenticationService.introspect(
                    IntrospectRequest.builder().token(token).build());

            if (!response.isValid()) {
                log.warn("Token validation failed: token is invalid");
                throw new JwtException("Token invalid");
            }
        } catch (JOSEException | ParseException e) {
            log.warn("Token parsing/verification failed: {}", e.getMessage());
            throw new JwtException("Token invalid: " + e.getMessage());
        } catch (Exception e) {
            // Catch any other unexpected exceptions
            log.error("Unexpected error during token introspection: {}", e.getMessage(), e);
            throw new JwtException("Token validation failed: " + e.getMessage());
        }

        // Náº¿u token cÃ²n hiá»‡u lá»±c
        try {
            if (Objects.isNull(nimbusJwtDecoder)) {
                SecretKeySpec secretKeySpec = new SecretKeySpec(getSignerKeyBytes(), "HS512");
                nimbusJwtDecoder = NimbusJwtDecoder.withSecretKey(secretKeySpec)
                        .macAlgorithm(MacAlgorithm.HS512)
                        .build();
            }

            return nimbusJwtDecoder.decode(token);
        } catch (Exception e) {
            log.error("Error decoding JWT token: {}", e.getMessage(), e);
            throw new JwtException("Token decode failed: " + e.getMessage());
        }
    }

    private byte[] getSignerKeyBytes() {
        String sanitized = (signerKey == null) ? "" : signerKey.replaceAll("\\s", "");  // xÃ³a khoáº£ng tráº¯ng
        return sanitized.getBytes();
    }
}
