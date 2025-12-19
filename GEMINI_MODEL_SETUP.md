# Hướng Dẫn Setup Gemini Model

## Vấn Đề Model Not Found

Nếu gặp lỗi `404 NOT_FOUND` với model, có thể model name không đúng hoặc không có sẵn trong API version hiện tại.

## Cách Kiểm Tra Model Có Sẵn

### 1. List tất cả models có sẵn:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY"
```

### 2. Các model phổ biến trong v1beta:

- `gemini-1.5-flash` - Nhanh, rẻ, phù hợp cho chatbot
- `gemini-1.5-pro` - Mạnh hơn, tốt hơn cho complex tasks
- `gemini-2.0-flash-exp` - Experimental, có thể không ổn định
- `gemini-2.0-flash` - Model mới nhất (có thể hết quota free tier)

### 3. Cấu hình trong application.yaml:

```yaml
gemini:
  apiKey: ${GEMINI_API_KEY}
  model: gemini-1.5-flash  # Hoặc gemini-1.5-pro
```

## Giải Pháp

### Option 1: Dùng gemini-1.5-flash (Khuyến nghị)
```yaml
model: gemini-1.5-flash
```
- ✅ Có sẵn trong v1beta
- ✅ Nhanh và rẻ
- ✅ Quota tốt cho free tier

### Option 2: Dùng gemini-1.5-pro
```yaml
model: gemini-1.5-pro
```
- ✅ Có sẵn trong v1beta
- ✅ Mạnh hơn flash
- ⚠️ Có thể tốn nhiều token hơn

### Option 3: Kiểm tra model có sẵn
Chạy lệnh sau để xem model nào có sẵn:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY" | grep -i "name"
```

## Lưu Ý

1. **API Version**: Code hiện tại dùng `v1beta`. Nếu model không có trong v1beta, có thể cần đổi sang `v1`.

2. **Quota**: Một số model như `gemini-2.0-flash` có thể hết quota free tier. Nên dùng `gemini-1.5-flash` hoặc `gemini-1.5-pro`.

3. **Restart Backend**: Sau khi đổi model, cần restart backend để áp dụng thay đổi.


