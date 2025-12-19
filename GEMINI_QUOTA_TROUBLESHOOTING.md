# Troubleshooting Gemini API Quota Issues

## Vấn Đề: Limit = 0 (Chưa dùng gì đã hết quota)

Khi gặp lỗi `429 Quota Exceeded` với `limit: 0`, có 3 nguyên nhân chính:

### 1. ✅ Vietnam Tier Restriction (Đã xử lý trong code)
**Nguyên nhân:** Google có thể hạn chế quota cho tài khoản ở một số khu vực, đặc biệt với Gemini 2.0 Flash (experimental).

**Giải pháp:**
- Code đã detect và log warning khi `limit: 0`
- Không retry vô tận khi gặp `limit: 0`
- Khuyến nghị: Tạo API key mới hoặc đợi quota reset

### 2. ✅ Infinite Loop Prevention (Đã xử lý trong code)
**Nguyên nhân:** Code có thể gọi API liên tục khi gặp lỗi.

**Giải pháp đã áp dụng:**
- ✅ Retry logic có delay (exponential backoff: 2s → 4s → 8s)
- ✅ Parse retry delay từ API response
- ✅ Max retries = 3 (không retry vô tận)
- ✅ Scheduled task chỉ query database, KHÔNG gọi Gemini API
- ✅ Không load products context khi khởi động (comment lại)

**Kiểm tra:**
```java
// ChatbotService.java
- refreshProductsContext() chỉ query database ✅
- scheduledRefreshProductsContext() chỉ query database ✅
- callGeminiWithRetry() có delay và max retries ✅
```

### 3. ⚠️ API Key Leaked (Cần xử lý thủ công)
**Nguyên nhân:** API key đã bị paste công khai, người khác có thể đang dùng.

**Giải pháp:**
1. **Tạo API key mới ngay lập tức:**
   - Vào [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Xóa API key cũ
   - Tạo API key mới
   - **KHÔNG** share API key công khai

2. **Cập nhật environment variable:**
   ```bash
   # Windows PowerShell
   $env:GEMINI_API_KEY="your-new-api-key"
   
   # Linux/Mac
   export GEMINI_API_KEY="your-new-api-key"
   ```

3. **Hoặc cập nhật trong application.yaml:**
   ```yaml
   gemini:
     apiKey: your-new-api-key-here  # Chỉ dùng khi test local
   ```
   ⚠️ **LƯU Ý:** Không commit API key vào Git!

## Code Improvements Đã Thực Hiện

### 1. Detect Limit = 0
```java
if (errorBody != null && errorBody.contains("\"limit\": 0")) {
    log.error("Gemini API quota limit is 0...");
    // Không retry, throw error ngay
}
```

### 2. Parse Retry Delay từ API
```java
// Parse "Please retry in 7.5s" từ error response
Pattern pattern = Pattern.compile("Please retry in (\\d+(?:\\.\\d+)?)s");
// Sử dụng delay từ API thay vì fixed delay
```

### 3. Exponential Backoff
```java
// Delay: 2s → 4s → 8s
long delayMs = baseDelayMs * (long) Math.pow(2, retryCount - 1);
```

### 4. Max Retries = 3
```java
callGeminiWithRetry(geminiRequest, 3); // Không retry vô tận
```

## Kiểm Tra Code Không Có Infinite Loop

### ✅ Scheduled Task (An toàn)
```java
@Scheduled(fixedRate = PRODUCTS_CACHE_TTL) // 30 phút
public void scheduledRefreshProductsContext() {
    refreshProductsContext(); // Chỉ query database, KHÔNG gọi Gemini API
}
```

### ✅ Constructor (Đã comment)
```java
public ChatbotService(...) {
    // refreshProductsContext(); // Đã comment để tránh gọi khi khởi động
}
```

### ✅ Retry Logic (Có delay)
```java
if (statusCode == 429 && retryCount < maxRetries) {
    Thread.sleep(delayMs); // Có delay, không retry ngay
    continue;
}
```

## Giải Pháp Ngay Lập Tức

1. **Tạo API key mới** (quan trọng nhất!)
2. **Kiểm tra quota tại:** https://ai.dev/usage?tab=rate-limit
3. **Đợi quota reset** (thường reset theo ngày)
4. **Nâng cấp plan** nếu cần (trả phí)

## Best Practices

1. ✅ **KHÔNG** commit API key vào Git
2. ✅ Dùng environment variables
3. ✅ Rotate API key định kỳ
4. ✅ Monitor quota usage
5. ✅ Implement rate limiting ở application level


