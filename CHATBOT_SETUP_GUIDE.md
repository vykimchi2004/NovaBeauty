# Hướng dẫn Setup Chatbot AI với Google Gemini

## Tổng quan
Chatbot AI được xây dựng với:
- **Backend**: Spring Boot (Java)
- **Frontend**: ReactJS
- **AI API**: Google Gemini (text-based)

## 1. Lấy Gemini API Key

1. Truy cập [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Đăng nhập bằng tài khoản Google
3. Click "Create API Key"
4. Copy API key được tạo

## 2. Cấu hình Backend

### 2.1. Thêm API Key vào `application.yaml`

File: `backend/src/main/resources/application.yaml`

```yaml
gemini:
  apiKey: ${GEMINI_API_KEY:your-api-key-here}
  model: gemini-1.5-flash
```

**Lưu ý**: 
- Thay `your-api-key-here` bằng API key thực tế của bạn
- Hoặc set environment variable `GEMINI_API_KEY` để bảo mật hơn

### 2.2. Kiểm tra dependencies

Đảm bảo `pom.xml` đã có:
- `spring-boot-starter-webflux` (cho WebClient)
- `jackson-datatype-jsr310` (cho JSON serialization)

## 3. Cấu hình Frontend

### 3.1. Import Chatbot component

Thêm vào file layout chính (ví dụ: `App.js` hoặc `DefaultLayout.js`):

```jsx
import Chatbot from '~/components/Common/Chatbot';

function App() {
    return (
        <div>
            {/* ... other components ... */}
            <Chatbot />
        </div>
    );
}
```

## 4. Chạy ứng dụng

### Backend
```bash
cd backend
mvn spring-boot:run
```

### Frontend
```bash
cd frontend
npm start
```

## 5. Test Chatbot

1. Mở trình duyệt tại `http://localhost:3000`
2. Click vào nút chat ở góc phải màn hình
3. Gửi tin nhắn test: "Xin chào, bạn có thể giúp gì cho tôi?"
4. Kiểm tra response từ AI

## 6. API Endpoint

### POST `/api/chatbot/ask`

**Request:**
```json
{
  "message": "Câu hỏi của bạn",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "code": 1000,
  "result": {
    "reply": "Câu trả lời từ AI",
    "sessionId": "session-id-để-duy-trì-conversation"
  }
}
```

## 7. Tính năng

- ✅ Chat text-based với AI
- ✅ Duy trì conversation context qua sessionId
- ✅ UI đẹp, responsive
- ✅ Loading state khi AI đang xử lý
- ✅ Error handling
- ✅ Public endpoint (không cần authentication)

## 8. Troubleshooting

### Lỗi: "Gemini API error"
- Kiểm tra API key đúng chưa
- Kiểm tra internet connection
- Kiểm tra quota của Gemini API

### Lỗi: "CORS error"
- Backend đã cấu hình CORS trong `SecurityConfig`
- Kiểm tra frontend URL có đúng không

### Lỗi: "Connection refused"
- Đảm bảo backend đang chạy trên port 8080
- Kiểm tra `API_BASE_URL` trong frontend config

## 9. Mở rộng

### Thêm system prompt tùy chỉnh
Sửa `SYSTEM_PROMPT` trong `ChatbotService.java`

### Lưu conversation vào database
Thay thế `conversationHistory` Map bằng repository để lưu vào DB

### Thêm rate limiting
Thêm `@RateLimiter` annotation vào controller để giới hạn số request

## 10. Security Notes

- ⚠️ **KHÔNG** commit API key vào Git
- Sử dụng environment variables cho production
- Cân nhắc thêm rate limiting để tránh abuse
- Có thể thêm authentication nếu cần


