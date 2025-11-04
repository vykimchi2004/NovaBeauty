# Identity Service - Cosmetics Website

## Yêu cầu hệ thống

### Java Development Kit (JDK)
- **Khuyến nghị**: JDK 17 hoặc JDK 21
- **Tối thiểu**: JDK 17
- **Kiểm tra version**: `java -version`

### Maven
- **Version**: 3.6 trở lên
- **Kiểm tra version**: `mvn -version`

### MySQL
- **Version**: 8.0 trở lên
- **Port**: 3306 (mặc định)

## Cài đặt và chạy

### 1. Clone repository
```bash
git clone <repository-url>
cd lumina-books
```

### 2. Cấu hình database
Tạo database MySQL:
```sql
CREATE DATABASE cosmetics_db;
CREATE USER 'cosmetics_user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON cosmetics_db.* TO 'cosmetics_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Cấu hình application
Cập nhật file `src/main/resources/application.yml`:
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/cosmetics_db
    username: cosmetics_user
    password: password
```

### 4. Chạy ứng dụng
```bash
# Với JDK 17
mvn spring-boot:run

# Hoặc build và chạy JAR
mvn clean package
java -jar target/lumina-books-0.0.1-SNAPSHOT.jar
```

## Tương thích JDK

### JDK 17 (Khuyến nghị)
```bash
# Kiểm tra version
java -version
# Output: openjdk version "17.0.x"

# Chạy ứng dụng
mvn spring-boot:run
```

### JDK 21 (Tương thích)
```bash
# Kiểm tra version
java -version
# Output: openjdk version "21.0.x"

# Chạy ứng dụng (tự động compile với target 17)
mvn spring-boot:run
```

### JDK 24 (Tương thích)
```bash
# Kiểm tra version
java -version
# Output: openjdk version "24.0.x"

# Chạy ứng dụng (tự động compile với target 17)
mvn spring-boot:run
```

## API Endpoints

### Authentication
- `POST /auth/token` - Đăng nhập
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Đăng xuất
- `POST /auth/introspect` - Kiểm tra token
- `POST /auth/send-otp` - Gửi mã OTP
- `POST /auth/verify-otp` - Xác định mã OTP
- `POST /auth/reset-password` - Quên mật khẩu
- `POST /auth/change-password` - Đổi mật khẩu

### User Management
- `POST /users` - Tạo user mới
- `GET /users` - Lấy danh sách users
- `GET /users/my-info` - Lấy thông tin user hiện tại

## Troubleshooting

### Lỗi JDK version
Nếu gặp lỗi về JDK version:
```bash
# Kiểm tra JAVA_HOME
echo $JAVA_HOME

# Set JAVA_HOME cho JDK 17
export JAVA_HOME=/path/to/jdk17
```

### Lỗi database connection
Kiểm tra:
1. MySQL service đang chạy
2. Database và user đã được tạo
3. Connection string trong application.yml đúng

## Development

### Chạy tests
```bash
mvn test
```

### Build production
```bash
mvn clean package -Pprod
```

## License
MIT License


## Docker guideline
`docker build -t <account>/lumina-books:0.9.0 .`
`docker build -t linhdev610/lumina-books:0.9.0 .`
### Push docker image to Docker Hub
`docker image push <account>/lumina-books:0.9.0`
`docker image push linhdev610/lumina-books:0.9.0`

### Create network:
`docker network create devteria-network`
### Show network list:
`docker network ls`
### Start MySQL in devteria-network
`docker run --network devteria-network --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root -d mysql:8.0.43-debian`
### Run your application in devteria-network
`docker run --name lumina-books --network devteria-network -p 8080:8080 -e DBMS_CONNECTION=jdbc:mysql://mysql:3306/identity_service lumina-books:0.9.0`