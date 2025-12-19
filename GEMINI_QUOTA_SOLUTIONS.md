# Giải Pháp Cho Vấn Đề Gemini API Quota Limit = 0

## ✅ Xác Nhận: API Key Hoạt Động

API key mới của bạn (`AIzaSyAaWiCZI2GkKPdRLoK5P6VLGrSNmGlY-S0`) **đã hoạt động**, nhưng gặp lỗi:
```
"limit": 0
```

Điều này có nghĩa là:
- ✅ API key hợp lệ
- ✅ Kết nối đến Gemini API thành công
- ❌ Quota limit = 0 (không có quota để sử dụng)

## 🔍 Nguyên Nhân

### 1. Vietnam Tier Restriction (Khả năng cao nhất)
Gemini 2.0 Flash đang trong giai đoạn thử nghiệm và có thể bị hạn chế ở một số khu vực.

### 2. Free Tier Chưa Được Kích Hoạt
Tài khoản Google Cloud của bạn có thể chưa được kích hoạt đầy đủ cho Gemini API Free Tier.

### 3. Quota Đã Hết
Free tier có giới hạn theo ngày/tháng, có thể đã hết.

## 💡 Giải Pháp

### Giải Pháp 1: Kiểm Tra Quota (Ưu tiên)
1. Truy cập: https://ai.dev/usage?tab=rate-limit
2. Đăng nhập với tài khoản Google Cloud của bạn
3. Kiểm tra:
   - Quota hiện tại
   - Limit còn lại
   - Thời gian reset

### Giải Pháp 2: Đợi Quota Reset
- Free tier thường reset theo ngày (00:00 UTC)
- Đợi đến ngày hôm sau và thử lại

### Giải Pháp 3: Thử Model Khác
Nếu Gemini 2.0 Flash bị hạn chế, thử các model khác:

**Option A: Gemini 1.5 Flash** (Ổn định hơn)
```yaml
gemini:
  apiKey: ${GEMINI_API_KEY}
  model: gemini-1.5-flash
```

**Option B: Gemini Pro** (Model cũ hơn nhưng ổn định)
```yaml
gemini:
  apiKey: ${GEMINI_API_KEY}
  model: gemini-pro
```

**Option C: Gemini 1.5 Pro** (Nếu có)
```yaml
gemini:
  apiKey: ${GEMINI_API_KEY}
  model: gemini-1.5-pro
```

### Giải Pháp 4: Nâng Cấp Plan (Trả Phí)
Nếu cần sử dụng ngay:
1. Truy cập: https://ai.google.dev/pricing
2. Nâng cấp lên paid plan
3. Có quota cao hơn và không bị hạn chế theo khu vực

### Giải Pháp 5: Sử Dụng API Key Khác
1. Tạo Google Cloud Project mới
2. Enable Gemini API
3. Tạo API key mới
4. Có thể có quota khác nhau

## 🔧 Cập Nhật Backend

### Bước 1: Cập Nhật Environment Variable
```powershell
# Windows PowerShell
$env:GEMINI_API_KEY="AIzaSyAaWiCZI2GkKPdRLoK5P6VLGrSNmGlY-S0"
```

### Bước 2: Thử Model Khác (Nếu cần)
Sửa `application.yaml`:
```yaml
gemini:
  apiKey: ${GEMINI_API_KEY}
  model: gemini-1.5-flash  # Thử model này nếu 2.0-flash không hoạt động
```

### Bước 3: Restart Backend
```bash
# Restart Spring Boot application
```

## 📊 Kiểm Tra Model Có Sẵn

Để xem các model có sẵn, gọi API:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY"
```

## ⚠️ Lưu Ý

1. **KHÔNG** commit API key vào Git
2. **KHÔNG** share API key công khai
3. Sử dụng environment variables
4. Monitor quota usage thường xuyên

## 🎯 Khuyến Nghị

1. **Ngay lập tức:** Kiểm tra quota tại https://ai.dev/usage?tab=rate-limit
2. **Nếu limit = 0:** Đợi reset hoặc thử model khác (gemini-1.5-flash)
3. **Nếu cần ngay:** Nâng cấp plan trả phí
4. **Code đã sẵn sàng:** Backend đã được tối ưu để xử lý các lỗi này

