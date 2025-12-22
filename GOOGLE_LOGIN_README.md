# Hướng Dẫn Đăng Nhập Bằng Google - NovaBeauty

## Mục Lục
1. [Tổng Quan](#tổng-quan)
2. [Luồng Hoạt Động](#luồng-hoạt-động)
3. [Cấu Hình](#cấu-hình)
4. [Cấu Trúc Code](#cấu-trúc-code)
5. [Lưu Trữ Dữ Liệu](#lưu-trữ-dữ-liệu)
6. [Xử Lý Encoding UTF-8](#xử-lý-encoding-utf-8)
7. [Troubleshooting](#troubleshooting)

---

## Tổng Quan

Hệ thống NovaBeauty hỗ trợ đăng nhập bằng Google sử dụng **Google Identity Services** và **OAuth 2.0**. Người dùng có thể đăng nhập bằng tài khoản Google mà không cần tạo tài khoản mới.

### Công Nghệ Sử Dụng
- **Frontend**: React, Google Identity Services
- **Backend**: Spring Boot, JPA/Hibernate
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Token)

---

## Luồng Hoạt Động

### Sơ Đồ Tổng Quan

```
[User] Click "Đăng nhập với Google"
    ↓
[Frontend] Load Google Identity Services Script
    ↓
[Frontend] Initialize Google Sign-In
    ↓
[Google] Hiển thị popup đăng nhập
    ↓
[User] Chọn tài khoản Google
    ↓
[Google] Trả về ID Token (JWT)
    ↓
[Frontend] Decode ID Token → Lấy email, name, picture
    ↓
[Frontend] POST /auth/google {idToken, email, fullName, picture}
    ↓
[Backend] Validate email
    ↓
[Backend] Tìm/Create User trong database
    ↓
[Backend] Tạo JWT Access Token + Refresh Token
    ↓
[Backend] Trả về {token, refreshToken}
    ↓
[Frontend] Lưu tokens vào storage
    ↓
[Frontend] GET /users/my-info → Lưu user info
    ↓
[Frontend] Điều hướng theo role
    ↓
[User] Đăng nhập thành công!
```

### Chi Tiết Từng Bước

#### Bước 1: Khởi Tạo Google Identity Services (Frontend)

**File:** `frontend/src/pages/Auth/LoginModal.js`

Khi modal đăng nhập mở (`isOpen = true`):

1. Kiểm tra script Google Identity Services đã load chưa
2. Nếu chưa: Tạo `<script>` tag và load từ `https://accounts.google.com/gsi/client`
3. Khi script load xong → Gọi `initializeGoogleSignIn()`

```javascript
const initializeGoogleSignIn = () => {
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  
  if (window.google && window.google.accounts && window.google.accounts.id) {
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredentialResponse,
    });
    
    // Render Google button vào div ẩn
    window.google.accounts.id.renderButton(hiddenDiv, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
    });
  }
};
```

#### Bước 2: Người Dùng Click Nút "Đăng Nhập Với Google"

**File:** `frontend/src/pages/Auth/LoginModal.js` - `handleGoogleButtonClick()`

1. Kiểm tra Google Client ID có tồn tại không
2. Tìm Google button đã render trong div ẩn
3. Trigger click vào Google button → Google hiển thị popup đăng nhập
4. Người dùng chọn tài khoản Google và cho phép quyền truy cập

#### Bước 3: Google Trả Về ID Token

**File:** `frontend/src/pages/Auth/LoginModal.js` - `handleGoogleCredentialResponse()`

**Response từ Google:**
```javascript
{
  credential: "eyJhbGciOiJSUzI1NiIs...", // ID Token (JWT)
  clientId: "392247953750-...",
  select_by: "btn"
}
```

**Decode ID Token:**
1. Tách ID token thành 3 phần: `header.payload.signature`
2. Decode phần payload (Base64URL → UTF-8)
3. Parse JSON để lấy:
   - `email`: Email từ Google
   - `name`: Tên đầy đủ
   - `picture`: URL ảnh đại diện

**Code xử lý:**
```javascript
// Decode Base64URL với UTF-8 support
let payloadBase64 = parts[1];
payloadBase64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');

// Thêm padding nếu cần
const pad = payloadBase64.length % 4;
if (pad) {
  payloadBase64 += new Array(5 - pad).join('=');
}

// Decode với UTF-8
const binaryString = atob(payloadBase64);
const utf8String = decodeURIComponent(escape(binaryString));
const payload = JSON.parse(utf8String);

// Lấy thông tin user
userInfo = {
  email: payload.email,
  name: payload.name,
  picture: payload.picture,
};
```

#### Bước 4: Gửi Request Lên Backend

**File:** `frontend/src/services/auth.js` - `loginWithGoogle()`

**API Call:**
```javascript
POST /auth/google
Headers: {
  'Content-Type': 'application/json; charset=UTF-8'
}
Body: {
  "idToken": "eyJhbGciOiJSUzI1NiIs...",
  "email": "user@gmail.com",
  "fullName": "Tên Người Dùng",
  "picture": "https://lh3.googleusercontent.com/..."
}
```

#### Bước 5: Backend Xử Lý Request

**File:** `backend/src/main/java/com/nova_beauty/backend/controller/AuthenticationController.java`

```java
@PostMapping("/google")
ApiResponse<AuthenticationResponse> authenticateWithGoogle(
    @RequestBody GoogleLoginRequest request
) {
    var result = authenticationService.authenticateWithGoogle(request);
    return ApiResponse.<AuthenticationResponse>builder()
        .result(result)
        .build();
}
```

**Lưu ý:** Endpoint này là PUBLIC (không cần authentication) - đã được thêm vào `PUBLIC_POST_ENDPOINTS` trong `SecurityConfig.java`.

#### Bước 6: Backend Xác Thực Và Tạo/Tìm User

**File:** `backend/src/main/java/com/nova_beauty/backend/service/AuthenticationService.java`

**Quy trình:**

1. **Validate email:**
   ```java
   if (request.getEmail() == null || request.getEmail().isEmpty()) {
       throw new AppException("Email từ Google không hợp lệ");
   }
   ```

2. **Tìm user theo email:**
   ```java
   User user = userRepository.findByEmail(email).orElse(null);
   ```

3. **Nếu user chưa tồn tại → Tạo user mới:**
   ```java
   user = User.builder()
       .email(email)
       .fullName(request.getFullName() != null ? 
                 request.getFullName() : 
                 email.split("@")[0])
       .password("")  // Rỗng, không cần password
       .isActive(true)  // Tự động kích hoạt
       .createAt(LocalDate.now())
       .role(customerRole)  // Role CUSTOMER mặc định
       .phoneNumber("")
       .address("")
       .build();
   
   user = userRepository.save(user);  // Lưu vào database
   ```

4. **Nếu user đã tồn tại:**
   - Kiểm tra `isActive`
   - Nếu bị khóa → throw `ACCOUNT_LOCKED`
   - Nếu active → tiếp tục

5. **Tạo JWT tokens:**
   ```java
   var accessToken = generateAccessToken(user);   // Ngắn hạn (1 giờ)
   var refreshToken = generateRefreshToken(user);  // Dài hạn (100 giờ)
   ```

6. **Trả về response:**
   ```json
   {
     "token": "eyJhbGciOiJIUzUxMiIs...",
     "refreshToken": "eyJhbGciOiJIUzUxMiIs...",
     "authenticated": true
   }
   ```

#### Bước 7: Frontend Lưu Token Và Thông Tin User

**File:** `frontend/src/pages/Auth/LoginModal.js`

1. **Lưu tokens vào storage:**
   ```javascript
   storage.set(STORAGE_KEYS.TOKEN, authResponse.token);
   storage.set(STORAGE_KEYS.REFRESH_TOKEN, authResponse.refreshToken);
   ```

2. **Lấy thông tin user từ backend:**
   ```javascript
   backendUserInfo = await getMyInfo();  // GET /users/my-info
   storage.set(STORAGE_KEYS.USER, backendUserInfo);
   ```

3. **Gọi callback và đóng modal:**
   ```javascript
   onLoginSuccess(backendUserInfo);
   onClose();
   ```

#### Bước 8: Điều Hướng Theo Role

**File:** `frontend/src/pages/Auth/LoginModal.js`

```javascript
const roleName = backendUserInfo?.role?.name?.toUpperCase() || '';

if (loggedInEmail === 'admin@novabeauty.com' || roleName === 'ADMIN') {
    navigate('/admin', { replace: true });
} else if (roleName === 'STAFF') {
    navigate('/staff', { replace: true });
} else if (roleName === 'CUSTOMER_SUPPORT') {
    navigate('/customer-support', { replace: true });
} else {
    window.location.reload();  // Customer hoặc role khác
}
```

---

## Cấu Hình

### 1. Frontend Configuration

#### File `.env` trong thư mục `frontend/`:

```env
REACT_APP_GOOGLE_CLIENT_ID=392247953750-7lia6rl1cm2mkr7i1thufgeplliiqfer.apps.googleusercontent.com
```

**Lưu ý:** File `.env` đã được thêm vào `.gitignore` để không commit lên Git.

#### Kiểm tra biến môi trường:

Sau khi restart server, kiểm tra trong Console:
```javascript
console.log(process.env.REACT_APP_GOOGLE_CLIENT_ID);
```

### 2. Google Cloud Console Configuration

#### Bước 1: Truy Cập Google Cloud Console
- Vào: https://console.cloud.google.com/
- Đăng nhập bằng tài khoản Google

#### Bước 2: Chọn Project
- Click vào dropdown project ở trên cùng
- Chọn project chứa OAuth Client ID

#### Bước 3: Vào Credentials
- Menu bên trái: **APIs & Services** → **Credentials**
- Hoặc tìm "Credentials" trong search bar

#### Bước 4: Mở OAuth 2.0 Client ID
- Tìm OAuth Client ID có Client ID: `392247953750-7lia6rl1cm2mkr7i1thufgeplliiqfer`
- Click vào tên hoặc icon edit để mở

#### Bước 5: Thêm Authorized JavaScript Origins
- Cuộn xuống phần **"Authorized JavaScript origins"**
- Click **"+ ADD URI"**
- Thêm các origin sau:
  ```
  http://localhost:3000
  http://localhost:3001
  http://127.0.0.1:3000
  ```
- **Lưu ý:** Không có dấu `/` ở cuối

#### Bước 6: Thêm Authorized Redirect URIs
- Cuộn xuống phần **"Authorized redirect URIs"**
- Click **"+ ADD URI"**
- Thêm các URI sau:
  ```
  http://localhost:3000
  http://localhost:3001
  http://127.0.0.1:3000
  ```

#### Bước 7: Save
- Click **"SAVE"** ở cuối trang
- Đợi thông báo "Saved successfully"
- **Quan trọng:** Đợi 2-5 phút để thay đổi có hiệu lực

### 3. Backend Configuration

#### File `application.yaml`:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/nova_beauty?useUnicode=true&characterEncoding=UTF-8&useSSL=false&serverTimezone=UTC
    driverClassName: com.mysql.cj.jdbc.Driver
    username: root
    password: root
  
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false  # Set true để xem SQL queries
    database-platform: org.hibernate.dialect.MySQLDialect
  
  http:
    encoding:
      charset: UTF-8
      enabled: true
      force: true
```

#### Security Configuration:

**File:** `backend/src/main/java/com/nova_beauty/backend/configuration/SecurityConfig.java`

Endpoint `/auth/google` đã được thêm vào `PUBLIC_POST_ENDPOINTS`:

```java
private static final String[] PUBLIC_POST_ENDPOINTS = {
    "/users",
    "/auth/token",
    "/auth/google",  // Google OAuth login endpoint
    "/auth/introspect",
    "/auth/logout",
    "/auth/refresh",
    "/auth/send-otp",
    "/auth/verify-otp",
    "/auth/reset-password",
    // ... các endpoint khác
};
```

### 4. Database Configuration

#### Kiểm Tra Database Charset:

```sql
-- Kiểm tra database charset
SHOW CREATE DATABASE nova_beauty;

-- Nếu không phải utf8mb4, sửa lại:
ALTER DATABASE nova_beauty CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### Kiểm Tra Table Charset:

```sql
-- Kiểm tra table users charset
SHOW CREATE TABLE users;

-- Nếu không phải utf8mb4, sửa lại:
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### Kiểm Tra Column Charset:

```sql
-- Kiểm tra column full_name charset
SHOW FULL COLUMNS FROM users WHERE Field = 'full_name';

-- Nếu không phải utf8mb4, sửa lại:
ALTER TABLE users MODIFY COLUMN full_name VARCHAR(255) 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## Cấu Trúc Code

### Frontend Files

#### 1. `frontend/src/pages/Auth/LoginModal.js`
- Component chính xử lý đăng nhập
- Load Google Identity Services script
- Khởi tạo Google Sign-In
- Xử lý callback từ Google
- Decode ID token
- Gọi API login

**Các hàm chính:**
- `initializeGoogleSignIn()`: Khởi tạo Google Identity Services
- `handleGoogleButtonClick()`: Xử lý khi click nút Google
- `handleGoogleCredentialResponse()`: Xử lý response từ Google

#### 2. `frontend/src/services/auth.js`
- Service xử lý authentication
- Hàm `loginWithGoogle()`: Gọi API `/auth/google`

#### 3. `frontend/src/services/config.js`
- Cấu hình API endpoints
- `API_ENDPOINTS.AUTH.GOOGLE = '/auth/google'`

#### 4. `frontend/.env`
- Chứa `REACT_APP_GOOGLE_CLIENT_ID`
- Đã được thêm vào `.gitignore`

### Backend Files

#### 1. `backend/src/main/java/com/nova_beauty/backend/controller/AuthenticationController.java`
- Controller xử lý authentication requests
- Endpoint: `POST /auth/google`

#### 2. `backend/src/main/java/com/nova_beauty/backend/service/AuthenticationService.java`
- Service xử lý logic authentication
- Hàm `authenticateWithGoogle()`: Xử lý Google login

#### 3. `backend/src/main/java/com/nova_beauty/backend/dto/request/GoogleLoginRequest.java`
- DTO chứa request từ frontend
- Fields: `idToken`, `email`, `fullName`, `picture`

#### 4. `backend/src/main/java/com/nova_beauty/backend/entity/User.java`
- Entity đại diện cho user trong database
- Column `full_name` đã được cấu hình với charset `utf8mb4`

#### 5. `backend/src/main/java/com/nova_beauty/backend/repository/UserRepository.java`
- Repository để truy vấn database
- Methods: `findByEmail()`, `existsByEmail()`, `save()`

#### 6. `backend/src/main/java/com/nova_beauty/backend/configuration/SecurityConfig.java`
- Cấu hình security
- Endpoint `/auth/google` đã được thêm vào public endpoints

---

## Lưu Trữ Dữ Liệu

### Database: MySQL

- **Database name:** `nova_beauty`
- **Host:** `localhost:3306`
- **Username:** `root`
- **Password:** `root`

### Table: `users`

**Cấu trúc:**

```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,              -- UUID tự động tạo
    password VARCHAR(255),                    -- Mật khẩu (rỗng nếu Google login)
    full_name VARCHAR(255),                  -- Tên đầy đủ (UTF-8)
    email VARCHAR(255) UNIQUE NOT NULL,      -- Email (unique)
    phone_number VARCHAR(20),                -- Số điện thoại
    address TEXT,                            -- Địa chỉ
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Trạng thái kích hoạt
    create_at DATE,                          -- Ngày tạo
    role VARCHAR(36),                        -- Foreign key đến roles
    FOREIGN KEY (role) REFERENCES roles(id)
);
```

### Các Trường Quan Trọng

| Trường | Mô Tả | Ví Dụ |
|--------|-------|-------|
| `id` | UUID tự động tạo | `"a1b2c3d4-e5f6-..."` |
| `email` | Email (unique, không trùng) | `"user@gmail.com"` |
| `full_name` | Tên đầy đủ | `"VY Vũ Hồ Yến"` |
| `password` | Mật khẩu đã hash (rỗng nếu Google login) | `"$2a$10$..."` hoặc `""` |
| `is_active` | Trạng thái tài khoản | `true` hoặc `false` |
| `role` | Vai trò (CUSTOMER, ADMIN, STAFF...) | `"CUSTOMER"` |
| `create_at` | Ngày tạo tài khoản | `2025-01-22` |

### Quan Hệ Với Các Bảng Khác

```
users
├── role → roles (Many-to-One)
├── cart → cart (One-to-One)
├── orders → orders (One-to-Many)
├── reviews → reviews (One-to-Many)
├── addresses → addresses (Many-to-Many qua user_addresses)
└── notifications → notifications (Many-to-Many qua user_notifications)
```

### Cách Tài Khoản Được Lưu Vào Database

#### Quy Trình:

1. **Tạo User Entity Object** (trong memory)
   ```java
   user = User.builder()
       .email(email)
       .fullName(request.getFullName())
       .password("")
       .isActive(true)
       .createAt(LocalDate.now())
       .role(customerRole)
       .build();
   ```

2. **Gọi Repository.save()**
   ```java
   user = userRepository.save(user);
   ```

3. **Hibernate Xử Lý:**
   - Generate UUID cho `id`
   - Validate entity
   - Tạo SQL INSERT statement
   - Execute SQL qua JDBC
   - Commit transaction

4. **MySQL Lưu Vào Disk:**
   - Ghi dữ liệu vào table `users`
   - Lưu vào file database

#### SQL Query Được Tạo:

```sql
INSERT INTO users (
    id, email, full_name, password, phone_number, 
    address, is_active, create_at, role
) VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'user@gmail.com',
    'VY Vũ Hồ Yến',
    '',
    '',
    '',
    true,
    '2025-01-22',
    'CUSTOMER'
);
```

### Kiểm Tra Dữ Liệu

#### Xem tất cả users:
```sql
SELECT * FROM users;
```

#### Xem user cụ thể:
```sql
SELECT * FROM users WHERE email = 'user@gmail.com';
```

#### Xem users đăng nhập bằng Google (password rỗng):
```sql
SELECT id, email, full_name, create_at, role 
FROM users 
WHERE password = '' OR password IS NULL;
```

#### Xem thông tin user kèm role:
```sql
SELECT u.id, u.email, u.full_name, u.is_active, r.name as role_name
FROM users u
LEFT JOIN roles r ON u.role = r.id;
```

---

## Xử Lý Encoding UTF-8

### Vấn Đề

Khi đăng nhập bằng Google, tên tiếng Việt có thể bị hiển thị sai (ví dụ: "VY Vũ Hồ Yến" → "VY VÅ¨ HÃ Yáº¾N").

### Giải Pháp

#### 1. Frontend: Decode ID Token Với UTF-8

**File:** `frontend/src/pages/Auth/LoginModal.js`

```javascript
// Decode Base64URL với UTF-8 support
let payloadBase64 = parts[1];
payloadBase64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');

// Thêm padding nếu cần
const pad = payloadBase64.length % 4;
if (pad) {
  payloadBase64 += new Array(5 - pad).join('=');
}

// Decode với UTF-8
const binaryString = atob(payloadBase64);
const utf8String = decodeURIComponent(escape(binaryString));
const payload = JSON.parse(utf8String);
```

#### 2. Frontend: Request Header Với UTF-8

**File:** `frontend/src/services/auth.js`

```javascript
headers: {
  'Content-Type': 'application/json; charset=UTF-8',
}
```

#### 3. Backend: Database Connection Với UTF-8

**File:** `backend/src/main/resources/application.yaml`

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/nova_beauty?useUnicode=true&characterEncoding=UTF-8&useSSL=false&serverTimezone=UTC
```

#### 4. Backend: HTTP Encoding

**File:** `backend/src/main/resources/application.yaml`

```yaml
spring:
  http:
    encoding:
      charset: UTF-8
      enabled: true
      force: true
```

#### 5. Backend: Entity Column Với UTF-8

**File:** `backend/src/main/java/com/nova_beauty/backend/entity/User.java`

```java
@Column(name = "full_name", columnDefinition = "VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
String fullName;
```

#### 6. Database: Charset utf8mb4

```sql
-- Kiểm tra database charset
SHOW CREATE DATABASE nova_beauty;

-- Sửa database charset
ALTER DATABASE nova_beauty CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Sửa table charset
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Sửa column charset
ALTER TABLE users MODIFY COLUMN full_name VARCHAR(255) 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Lưu Ý

- **utf8mb4** (không phải `utf8`) để hỗ trợ đầy đủ ký tự tiếng Việt
- Sau khi sửa database charset, các user mới sẽ có encoding đúng
- User cũ có thể cần update lại `full_name`

---

## Troubleshooting

### Lỗi 1: `Missing required parameter: client_id`

**Nguyên nhân:** Biến môi trường `REACT_APP_GOOGLE_CLIENT_ID` chưa được load.

**Giải pháp:**
1. Kiểm tra file `.env` trong thư mục `frontend/` có tồn tại không
2. Kiểm tra có dòng: `REACT_APP_GOOGLE_CLIENT_ID=...`
3. **Restart development server** (quan trọng!)
4. Kiểm tra trong Console: `console.log(process.env.REACT_APP_GOOGLE_CLIENT_ID)`

### Lỗi 2: `403 - The given origin is not allowed`

**Nguyên nhân:** Origin hiện tại chưa được thêm vào Google Cloud Console.

**Giải pháp:**
1. Vào Google Cloud Console → Credentials
2. Mở OAuth 2.0 Client ID
3. Thêm `http://localhost:3000` vào **Authorized JavaScript origins**
4. Thêm `http://localhost:3000` vào **Authorized redirect URIs**
5. Click **SAVE**
6. Đợi 2-5 phút để thay đổi có hiệu lực
7. Hard refresh trang web (Ctrl + Shift + R)

### Lỗi 3: `401 Unauthenticated` từ Backend

**Nguyên nhân:** Endpoint `/auth/google` chưa được thêm vào public endpoints.

**Giải pháp:**
1. Kiểm tra `SecurityConfig.java`
2. Đảm bảo `/auth/google` có trong `PUBLIC_POST_ENDPOINTS`
3. Restart backend server

### Lỗi 4: `InvalidCharacterError: Failed to execute 'atob'`

**Nguyên nhân:** ID token không được decode đúng cách.

**Giải pháp:**
- Code đã được sửa để xử lý Base64URL và UTF-8 đúng cách
- Nếu vẫn lỗi, kiểm tra lại cách decode trong `LoginModal.js`

### Lỗi 5: Tên Hiển Thị Sai Encoding

**Nguyên nhân:** Database hoặc connection không dùng UTF-8.

**Giải pháp:**
1. Kiểm tra database charset: `SHOW CREATE DATABASE nova_beauty;`
2. Kiểm tra table charset: `SHOW CREATE TABLE users;`
3. Sửa charset sang `utf8mb4` nếu cần
4. Kiểm tra connection string có `characterEncoding=UTF-8`
5. Restart backend server

### Lỗi 6: `DataIntegrityViolationException` - Email đã tồn tại

**Nguyên nhân:** Email đã được sử dụng bởi user khác.

**Giải pháp:**
- Đây là hành vi bình thường
- Hệ thống sẽ sử dụng user hiện tại thay vì tạo mới

### Debug Tips

#### 1. Bật SQL Logging:

**File:** `application.yaml`
```yaml
jpa:
  show-sql: true  # Hiển thị SQL queries trong console
```

#### 2. Kiểm Tra Logs:

**Frontend Console (F12):**
- `[Google Sign-In] Client ID: Found/Missing`
- `[Google Sign-In] Current Origin: ...`
- `[Google Sign-In] Decoded payload: ...`
- `[Google Sign-In] Extracted user info: ...`

**Backend Logs:**
- `Creating new user from Google login: ...`
- `Created new user from Google: ...`
- `Existing user logging in with Google: ...`

#### 3. Kiểm Tra Database:

```sql
-- Xem user vừa tạo
SELECT * FROM users WHERE email = 'user@gmail.com';

-- Xem encoding của full_name
SELECT email, full_name, HEX(full_name) FROM users WHERE email = 'user@gmail.com';
```

---

## Checklist Hoàn Thành

### Frontend
- [x] File `.env` có `REACT_APP_GOOGLE_CLIENT_ID`
- [x] File `.env` đã được thêm vào `.gitignore`
- [x] Code load Google Identity Services script
- [x] Code decode ID token với UTF-8
- [x] Code gọi API `/auth/google`
- [x] Code lưu tokens vào storage
- [x] Code điều hướng theo role

### Backend
- [x] Endpoint `/auth/google` đã được tạo
- [x] Endpoint `/auth/google` đã được thêm vào public endpoints
- [x] Service `authenticateWithGoogle()` đã được implement
- [x] Entity `User` có column `full_name` với charset utf8mb4
- [x] Database connection có `characterEncoding=UTF-8`
- [x] HTTP encoding được cấu hình UTF-8

### Google Cloud Console
- [x] OAuth 2.0 Client ID đã được tạo
- [x] Authorized JavaScript origins đã được thêm
- [x] Authorized redirect URIs đã được thêm
- [x] Đã click SAVE và đợi vài phút

### Database
- [x] Database charset là `utf8mb4`
- [x] Table `users` charset là `utf8mb4`
- [x] Column `full_name` charset là `utf8mb4`

---

## Tài Liệu Tham Khảo

- [Google Identity Services Documentation](https://developers.google.com/identity/gsi/web)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Spring Data JPA Documentation](https://spring.io/projects/spring-data-jpa)
- [MySQL UTF-8 Encoding](https://dev.mysql.com/doc/refman/8.0/en/charset-unicode.html)

---

## Liên Hệ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra lại các bước trong phần [Troubleshooting](#troubleshooting)
2. Xem logs trong Console (Frontend) và Logs (Backend)
3. Kiểm tra database charset và connection string

---

**Cập nhật lần cuối:** 22/01/2025

