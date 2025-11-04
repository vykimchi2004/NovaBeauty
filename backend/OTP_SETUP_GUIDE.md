# Hướng dẫn cấu hình OTP Email cho Identity Service

## 1. Cấu hình Email (Gmail)

### Bước 1: Tạo App Password cho Gmail
1. Đăng nhập vào Gmail
2. Vào **Google Account Settings** → **Security**
3. Bật **2-Step Verification** nếu chưa bật
4. Vào **App passwords** → **Select app** → **Mail** → **Select device** → **Other (Custom name)**
5. Nhập tên: "Identity Service" → **Generate**
6. Copy mật khẩu được tạo (16 ký tự)

### Bước 2: Cấu hình trong application.yaml
```yaml
spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: your-email@gmail.com  # Email Gmail của bạn
    password: your-app-password     # App password từ bước 1
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
          ssl:
            trust: smtp.gmail.com
```

### Bước 3: Cấu hình Environment Variables (Khuyến nghị)
Thay vì hardcode trong file config, sử dụng environment variables:

```bash
# Windows
set EMAIL_USERNAME=your-email@gmail.com
set EMAIL_PASSWORD=your-app-password

# Linux/Mac
export EMAIL_USERNAME=your-email@gmail.com
export EMAIL_PASSWORD=your-app-password
```

## 2. Cấu hình Database

### Bước 1: Đảm bảo MySQL đang chạy
```bash
# Kiểm tra MySQL service
mysql --version
```

### Bước 2: Tạo database (nếu chưa có)
```sql
CREATE DATABASE identity_service;
```

### Bước 3: Cấu hình connection trong application.yaml
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/identity_service
    username: root
    password: your-mysql-password
```

## 3. API Endpoints

### Gửi OTP
```
POST /identity/auth/send-otp?email=user@example.com
```

### Xác thực OTP
```
POST /identity/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

## 4. Chạy ứng dụng

### Backend (Spring Boot)
```bash
cd D:\identity_service_Linh\identity-service
mvn spring-boot:run
```

### Frontend (React)
```bash
cd D:\LuminaBook\luminabook
npm start
```

## 5. Test Flow

1. **Đăng ký**: Nhập email → Gửi OTP → Nhập OTP → Hoàn thành đăng ký
2. **Quên mật khẩu**: Nhập email → Gửi OTP → Nhập OTP → Đặt lại mật khẩu

## 6. Troubleshooting

### Lỗi gửi email
- Kiểm tra App Password đúng chưa
- Kiểm tra 2-Step Verification đã bật chưa
- Kiểm tra firewall/antivirus

### Lỗi database
- Kiểm tra MySQL đang chạy
- Kiểm tra connection string
- Kiểm tra quyền user database

### Lỗi CORS (nếu có)
Thêm vào SecurityConfig:
```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOriginPatterns(Arrays.asList("*"));
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE"));
    configuration.setAllowedHeaders(Arrays.asList("*"));
    configuration.setAllowCredentials(true);
    
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
}
```

## 7. Security Notes

- Không commit email credentials vào Git
- Sử dụng environment variables
- OTP có thời hạn 5 phút
- OTP chỉ sử dụng được 1 lần
- Tự động xóa OTP cũ khi tạo mới

