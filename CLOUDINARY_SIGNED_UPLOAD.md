# Cloudinary Signed Direct Upload - Setup Guide

## Tổng quan

Tính năng này cho phép upload ảnh/video trực tiếp từ frontend lên Cloudinary mà không cần qua backend, sử dụng **signed upload** để đảm bảo bảo mật.

## Flow hoạt động

```
Frontend                    Backend                     Cloudinary
   |                           |                            |
   |---(1) Request signature-->|                            |
   |                           |---(Generate signature)     |
   |<--(2) Return signature----|                            |
   |                                                        |
   |---(3) Upload file with signature)-------------------->|
   |                                                        |
   |<--(4) Return Cloudinary URL)--------------------------|
   |                                                        |
```

### Chi tiết các bước:

1. **Frontend yêu cầu chữ ký**: Gọi API `POST /media/cloudinary-signature?folder=product_media`
2. **Backend tạo chữ ký**: 
   - Validate folder name (chỉ cho phép: product_media, voucher_media, promotion_media, profile_media, banners)
   - Tạo timestamp hiện tại
   - Sign với API secret
   - Trả về: signature, timestamp, api_key, cloud_name, folder
3. **Frontend upload trực tiếp**: Upload file + signature lên `https://api.cloudinary.com/v1_1/{cloud_name}/auto/upload`
4. **Cloudinary validate**: Kiểm tra signature, nếu hợp lệ thì lưu file và trả về secure_url

## Backend Implementation

### CloudinarySignatureService.java

Located: `backend/src/main/java/com/nova_beauty/backend/service/CloudinarySignatureService.java`

**Main method:**
```java
public Map<String, Object> generateUploadSignature(String folder)
```

**Security features:**
- ✅ Folder name validation (whitelist approach)
- ✅ Timestamp-based signature (tự động expire sau vài phút)
- ✅ Signed với API secret (không expose ra frontend)

### MediaController.java

**New endpoint:**
```java
@PostMapping("/cloudinary-signature")
public ApiResponse<Map<String, Object>> getCloudinarySignature(@RequestParam String folder)
```

**Request:**
```
POST /nova_beauty/media/cloudinary-signature?folder=product_media
Authorization: Bearer {token}
```

**Response:**
```json
{
  "code": 1000,
  "message": "Success",
  "result": {
    "signature": "abc123def456...",
    "timestamp": 1703484000,
    "api_key": "123456789012345",
    "cloud_name": "your_cloud_name",
    "folder": "product_media"
  }
}
```

## Frontend Implementation

### cloudinaryService.js

Located: `frontend/src/services/cloudinaryService.js`

**Main functions:**

#### 1. getCloudinarySignature(folder)
Request signature từ backend.

#### 2. uploadToCloudinary(file, folder, onProgress)
Upload một file lên Cloudinary với progress tracking.

**Parameters:**
- `file`: File object
- `folder`: Target folder name
- `onProgress`: Callback function (percent) => void

**Returns:** Promise<string> - Cloudinary secure URL

**Example:**
```javascript
const url = await uploadToCloudinary(
  file,
  'product_media',
  (percent) => console.log(`Upload: ${percent}%`)
);
```

#### 3. uploadProductMediaDirect(files, onProgress)
Upload nhiều files với overall progress tracking.

### Usage in Components

**StaffProducts.js:**

```javascript
import { uploadToCloudinary } from '~/services/cloudinaryService';

// In uploadPendingMedia function:
const url = await uploadToCloudinary(
  file,
  'product_media',
  (percent) => {
    const overallProgress = Math.round(
      ((i / totalFiles) * 100) + ((percent / totalFiles))
    );
    setUploadProgress(overallProgress);
  }
);
```

## Configuration

### Backend (application.properties)

```properties
# Cloudinary configuration
cloudinary.cloud-name=${CLOUDINARY_CLOUD_NAME}
cloudinary.api-key=${CLOUDINARY_API_KEY}
cloudinary.api-secret=${CLOUDINARY_API_SECRET}
cloudinary.secure=true
```

### Frontend (.env)

Không cần thêm config mới, vì frontend đã có:
```
REACT_APP_API_BASE_URL=http://localhost:8080/nova_beauty
```

## Testing

### Manual Testing Steps

1. **Start backend:**
   ```bash
   cd backend
   .\mvnw spring-boot:run
   ```

2. **Start frontend:**
   ```bash
   cd frontend
   npm start
   ```

3. **Test upload:**
   - Login với tài khoản staff
   - Navigate to "Quản lý sản phẩm"
   - Click "Thêm sản phẩm"
   - Upload 3-5 ảnh
   - Điền thông tin và submit

4. **Verify:**
   - ✅ Upload progress bar hiển thị
   - ✅ Network tab shows request to `api.cloudinary.com` (NOT backend)
   - ✅ Sản phẩm được tạo thành công
   - ✅ Ảnh có URL từ Cloudinary
   - ✅ Check Cloudinary dashboard: images in `product_media/` folder

### Test Signature Expiration

1. Add product, select images but DON'T submit
2. Wait 6+ minutes
3. Submit form

**Expected:**
- Upload fails with "signature expired" error
- Frontend automatically requests new signature
- Upload succeeds

## Folder Structure

Cloudinary folders:
- `product_media/` - Product images
- `voucher_media/` - Voucher images
- `promotion_media/` - Promotion images
- `profile_media/` - User profile pictures
- `banners/` - Banner images

## Security Notes

- ✅ Signature chỉ valid trong vài phút (Cloudinary default: ~1 hour, có thể config ngắn hơn)
- ✅ API secret KHÔNG bao giờ expose ra frontend
- ✅ Endpoint `/cloudinary-signature` yêu cầu authentication (JWT token)
- ✅ Folder name được validate (whitelist)
- ⚠️ Rate limiting: Backend nên thêm rate limit cho signature endpoint (tránh spam)

## Troubleshooting

### Problem: Upload fails with "Invalid signature"

**Causes:**
- Timestamp mismatch (client time vs server time)
- Signature expired
- Wrong API secret

**Solutions:**
- Check server logs for signature generation
- Sync server time with NTP
- Verify Cloudinary credentials in `application.properties`

### Problem: Upload slow

**Possible causes:**
- Large file size
- Network bandwidth
- Cloudinary server location

**Solutions:**
- Compress images before upload (client-side)
- Use Cloudinary auto format/quality
- Consider upload preset with transformations

### Problem: "Folder not allowed"

**Cause:** Trying to upload to invalid folder

**Solution:** Use one of the allowed folders:
- product_media
- voucher_media
- promotion_media
- profile_media
- banners

## Performance Improvements

### Current Implementation
- ✅ Direct upload to Cloudinary (no backend bottleneck)
- ✅ Sequential upload with progress tracking
- ✅ Automatic retry on signature expiration

### Future Enhancements
1. **Parallel upload** for multiple files (use Promise.all)
2. **Client-side compression** before upload
3. **Upload preset** for automatic transformations
4. **Eager transformations** (thumbnails, webp)

## API Reference

### Backend Endpoint

**POST** `/media/cloudinary-signature`

**Query Parameters:**
- `folder` (required): Target folder name

**Headers:**
- `Authorization: Bearer {token}` (required)

**Response:**
```json
{
  "code": 1000,
  "result": {
    "signature": "string",
    "timestamp": number,
    "api_key": "string",
    "cloud_name": "string",
    "folder": "string"
  }
}
```

**Status Codes:**
- 200: Success
- 400: Invalid folder name
- 401: Unauthorized
- 500: Server error

### Cloudinary Upload Endpoint

**POST** `https://api.cloudinary.com/v1_1/{cloud_name}/auto/upload`

**Form Data:**
- `file`: File to upload
- `signature`: Signature from backend
- `timestamp`: Timestamp from backend
- `api_key`: API key from backend
- `folder`: Folder name

**Response:**
```json
{
  "secure_url": "https://res.cloudinary.com/...",
  "public_id": "product_media/abc123",
  "format": "jpg",
  "width": 1920,
  "height": 1080,
  ...
}
```

## Additional Resources

- [Cloudinary Upload Documentation](https://cloudinary.com/documentation/upload_images)
- [Signed Upload Documentation](https://cloudinary.com/documentation/upload_images#authenticated_uploads)
- [JavaScript SDK](https://cloudinary.com/documentation/javascript_integration)
