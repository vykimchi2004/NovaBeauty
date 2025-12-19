# Cải Thiện Xử Lý Lỗi Chatbot API

## 📊 Các Lỗi Đã Xử Lý

Dựa trên log dashboard, có 3 loại lỗi:
- **400 BadRequest**: 1 lần
- **404 NotFound**: 3 lần  
- **429 TooManyRequests**: 4 lần

## ✅ Các Cải Thiện Đã Thực Hiện

### 1. Xử Lý 400 BadRequest (Không Retry)

**Vấn đề:** Request body không đúng format hoặc thiếu field bắt buộc.

**Giải pháp:**
- ✅ Không retry khi gặp 400 (lỗi format không tự sửa được)
- ✅ Log chi tiết nguyên nhân có thể:
  - Request body format invalid
  - Missing required fields
  - Invalid parameter values
- ✅ Validate request trước khi gửi:
  - Kiểm tra `message` không null/blank
  - Kiểm tra `contents` không null/empty
  - Kiểm tra từng `content` và `part` có đầy đủ

**Code:**
```java
if (statusCode == 400) {
    log.error("Gemini API BadRequest (400)...");
    // Không retry, throw error ngay
    throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
}
```

### 2. Xử Lý 404 NotFound (Không Retry)

**Vấn đề:** Model name không tồn tại hoặc không available.

**Giải pháp:**
- ✅ Không retry khi gặp 404 (model không tồn tại)
- ✅ Log model name đang dùng
- ✅ Gợi ý các model có sẵn:
  - `gemini-2.0-flash`
  - `gemini-1.5-flash`
  - `gemini-pro`
  - `gemini-1.5-pro`
- ✅ Hướng dẫn sửa trong `application.yaml`

**Code:**
```java
if (statusCode == 404) {
    log.error("Gemini API NotFound (404). Model '{}' is not found...", model);
    log.error("Available models: gemini-2.0-flash, gemini-1.5-flash...");
    // Không retry, throw error ngay
    throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
}
```

### 3. Xử Lý 429 TooManyRequests (Có Retry Logic)

**Vấn đề:** Quota exceeded - đã xử lý trước đó.

**Giải pháp:**
- ✅ Detect `limit: 0` và không retry vô tận
- ✅ Retry với exponential backoff (2s → 4s → 8s)
- ✅ Parse retry delay từ API response
- ✅ Max retries = 3 (không retry vô tận)

**Code:**
```java
if (statusCode == 429) {
    if (errorBody.contains("\"limit\": 0")) {
        // Không retry khi limit = 0
        throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
    }
    if (retryCount < maxRetries) {
        // Retry với delay
        continue;
    }
}
```

### 4. Validation Trước Khi Gửi Request

**Thêm validation:**
- ✅ Validate `ChatRequest.message` không null/blank
- ✅ Validate `GeminiRequest.contents` không null/empty
- ✅ Validate từng `GeminiContent` và `GeminiPart`
- ✅ Validate `text` không null/blank

**Code:**
```java
// Validate request
if (request == null || request.getMessage() == null || request.getMessage().isBlank()) {
    log.error("Invalid chat request: message is null or blank");
    throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
}

// Validate Gemini request
if (geminiRequest == null || geminiRequest.getContents() == null || geminiRequest.getContents().isEmpty()) {
    log.error("Failed to build Gemini request: contents is null or empty");
    throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
}
```

## 🎯 Kết Quả Mong Đợi

Sau các cải thiện này:

1. **400 BadRequest**: 
   - Không retry vô ích
   - Log rõ ràng nguyên nhân
   - Validate trước để tránh lỗi

2. **404 NotFound**:
   - Không retry vô ích
   - Log model name và gợi ý model khác
   - Hướng dẫn sửa config

3. **429 TooManyRequests**:
   - Retry thông minh với delay
   - Detect limit = 0 và không retry
   - Parse retry delay từ API

## 📝 Lưu Ý

1. **Model Name**: Đảm bảo model name trong `application.yaml` đúng:
   ```yaml
   gemini:
     apiKey: ${GEMINI_API_KEY}
     model: gemini-2.0-flash  # Hoặc gemini-1.5-flash, gemini-pro
   ```

2. **API Key**: Đảm bảo API key hợp lệ và có quota:
   - Kiểm tra tại: https://ai.dev/usage?tab=rate-limit

3. **Request Format**: Code đã validate, nhưng đảm bảo frontend gửi đúng format:
   ```json
   {
     "message": "string",
     "sessionId": "string (optional)"
   }
   ```

## 🔍 Debug

Nếu vẫn gặp lỗi, kiểm tra log:
- `400`: Xem error body để biết field nào sai
- `404`: Xem model name có đúng không
- `429`: Xem quota còn lại và thời gian reset

