# Hướng dẫn cấu hình Email cho OTP

## Bước 1: Tạo Gmail App Password

1. **Đăng nhập Gmail** → **Google Account** → **Security**
2. **Bật 2-Step Verification** (nếu chưa có)
3. **App passwords** → **Mail** → **Other** → Nhập "Identity Service"
4. **Copy mật khẩu 16 ký tự** (ví dụ: `abcd efgh ijkl mnop`)

## Bước 2: Cấu hình trong application.yaml

Thay đổi trong file `src/main/resources/application.yaml`:

```yaml
spring:
  mail:
    username: your-actual-email@gmail.com  # Email thật của bạn
    password: your-16-char-app-password    # App Password từ bước 1
```

**Ví dụ:**
```yaml
spring:
  mail:
    username: nguyenvana@gmail.com
    password: abcd efgh ijkl mnop
```

## Bước 3: Restart Backend

Sau khi thay đổi config, restart backend:

```bash
mvn spring-boot:run
```

## Bước 4: Test API

### Gửi OTP:
```bash
curl -X POST "http://localhost:8080/identity/auth/send-otp?email=test@gmail.com"
```

### Verify OTP:
```bash
curl -X POST "http://localhost:8080/identity/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","otp":"123456"}'
```

## Lưu ý quan trọng:

- **KHÔNG** dùng mật khẩu Gmail thường
- **PHẢI** dùng App Password (16 ký tự)
- **PHẢI** bật 2-Step Verification trước
- Email sẽ được gửi đến hộp thư của người nhận

