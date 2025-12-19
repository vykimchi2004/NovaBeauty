# Chatbot Data Flow - Cách Chatbot Lấy Dữ Liệu Từ Database

## 📊 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  1. User gửi câu hỏi qua Frontend                              │
│     "Bạn có sản phẩm nào cho da dầu không?"                    │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. ChatbotController.ask()                                     │
│     POST /api/chatbot/ask                                        │
│     Body: { message: "...", sessionId: "..." }                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. ChatbotService.ask()                                        │
│     - Kiểm tra cache sản phẩm                                    │
│     - Nếu cache hết hạn → refreshProductsContext()              │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. refreshProductsContext()                                    │
│     List<ProductResponse> products =                            │
│         productService.getActiveProducts()                      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. ProductService.getActiveProducts()                           │
│     - Gọi repository:                                           │
│       productRepository.findByStatusWithCategory(APPROVED)      │
│     - Áp dụng promotion cho từng sản phẩm                       │
│     - Convert Entity → DTO bằng ProductMapper                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  6. ProductRepository.findByStatusWithCategory()               │
│     @Query("SELECT p FROM Product p                             │
│            LEFT JOIN FETCH p.category                            │
│            WHERE p.status = :status")                            │
│     → JPA tự động generate SQL query                           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  7. MySQL Database                                               │
│     SELECT p.*, c.*                                              │
│     FROM products p                                              │
│     LEFT JOIN categories c ON p.category_id = c.id              │
│     WHERE p.status = 'APPROVED'                                  │
│     → Trả về ResultSet                                          │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  8. JPA/Hibernate                                               │
│     - Map ResultSet → Product Entity objects                    │
│     - Load relationships (Category, Inventory, etc.)            │
│     - Trả về List<Product>                                      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  9. ProductMapper.toResponse()                                   │
│     - Convert Product Entity → ProductResponse DTO              │
│     - Map các field: name, price, description, etc.            │
│     - Tính toán giá sau promotion                               │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  10. Format thành Text Context                                  │
│      StringBuilder context = new StringBuilder();                │
│      context.append("DANH SÁCH SẢN PHẨM:\n\n");                 │
│      for (ProductResponse p : products) {                       │
│          context.append("1. Tên: " + p.getName() + "\n");       │
│          context.append("   Giá: " + p.getPrice() + "\n");        │
│          ...                                                     │
│      }                                                           │
│      → cachedProductsContext = context.toString()                │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  11. Đưa vào Prompt cho Gemini AI                               │
│      String prompt = SYSTEM_PROMPT +                            │
│                      "\n\n" +                                   │
│                      cachedProductsContext +                     │
│                      "\n\nCâu hỏi: " + userMessage              │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  12. Gọi Gemini API                                             │
│      POST https://generativelanguage.googleapis.com/...          │
│      Body: { contents: [{ role: "user", parts: [prompt] }] }    │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  13. Gemini AI xử lý                                           │
│      - Đọc context sản phẩm                                     │
│      - Phân tích câu hỏi user                                   │
│      - Tư vấn dựa trên dữ liệu thực tế                         │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  14. Trả về response                                            │
│      { reply: "Chúng tôi có các sản phẩm...",                   │
│        sessionId: "..." }                                        │
└─────────────────────────────────────────────────────────────────┘
```

## 🔍 Chi Tiết Code

### Bước 1: ChatbotService gọi ProductService

```java
// ChatbotService.java - Line 209
private void refreshProductsContext() {
    try {
        // Gọi ProductService để lấy danh sách sản phẩm active
        List<ProductResponse> products = productService.getActiveProducts();
        // ...
    }
}
```

### Bước 2: ProductService query database

```java
// ProductService.java - Line 492-496
public List<ProductResponse> getActiveProducts() {
    // Gọi Repository với JPQL query
    List<Product> products = productRepository.findByStatusWithCategory(ProductStatus.APPROVED);
    
    // Áp dụng promotion cho từng sản phẩm
    products.forEach(this::applyActivePromotionToProduct);
    
    // Convert Entity → DTO
    return products.stream()
        .map(productMapper::toResponse)
        .toList();
}
```

### Bước 3: Repository thực thi SQL

```java
// ProductRepository.java - Line 23-24
@Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.status = :status")
List<Product> findByStatusWithCategory(@Param("status") ProductStatus status);
```

**JPA tự động generate SQL:**
```sql
SELECT 
    p.id, p.name, p.description, p.price, p.status, 
    c.id as category_id, c.name as category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.status = 'APPROVED'
```

### Bước 4: Format thành Context

```java
// ChatbotService.java - Line 216-261
StringBuilder context = new StringBuilder();
context.append("DANH SÁCH SẢN PHẨM CỦA NOVA BEAUTY:\n\n");

for (int i = 0; i < maxProducts; i++) {
    ProductResponse product = products.get(i);
    context.append(String.format("%d. Tên: %s\n", i + 1, product.getName()));
    context.append(String.format("   Danh mục: %s\n", product.getCategoryName()));
    context.append(String.format("   Giá: %,.0f VNĐ\n", product.getPrice()));
    // ...
}
```

### Bước 5: Đưa vào Prompt

```java
// ChatbotService.java - Line 120-136
private GeminiRequest buildGeminiRequest(String userMessage, List<GeminiContent> history) {
    String systemPrompt = SYSTEM_PROMPT_BASE + "\n\n" + getProductsContext();
    
    if (history.isEmpty()) {
        contents.add(new GeminiContent("user", 
            systemPrompt + "\n\nCâu hỏi của khách hàng: " + userMessage));
    }
    // ...
}
```

## ⚡ Tối Ưu Performance

### 1. **Cache Mechanism**
- Cache sản phẩm trong memory (`cachedProductsContext`)
- TTL: 30 phút
- Tự động refresh khi hết hạn

### 2. **Lazy Loading**
- Chỉ load category khi cần (`LEFT JOIN FETCH`)
- Tránh N+1 query problem

### 3. **Giới hạn số lượng**
- Chỉ lấy 100 sản phẩm đầu tiên
- Tránh prompt quá dài

### 4. **Scheduled Refresh**
```java
@Scheduled(fixedRate = PRODUCTS_CACHE_TTL)
public void scheduledRefreshProductsContext() {
    refreshProductsContext();
}
```

## 📝 Ví Dụ Thực Tế

### Input từ Database:
```json
{
  "id": "prod-001",
  "name": "Kem dưỡng ẩm cho da dầu",
  "categoryName": "Skincare",
  "price": 250000,
  "skinType": "Da dầu",
  "description": "Kem dưỡng ẩm không gây bóng nhờn..."
}
```

### Output Context cho AI:
```
DANH SÁCH SẢN PHẨM CỦA NOVA BEAUTY:

1. Tên: Kem dưỡng ẩm cho da dầu
   Danh mục: Skincare
   Giá: 250,000 VNĐ
   Loại da phù hợp: Da dầu
   Mô tả: Kem dưỡng ẩm không gây bóng nhờn...
```

### AI Response:
"Chúng tôi có sản phẩm **Kem dưỡng ẩm cho da dầu** với giá 250,000 VNĐ, phù hợp cho da dầu và không gây bóng nhờn..."

## 🔄 Khi Nào Dữ Liệu Được Refresh?

1. **Khi khởi động service** - Load lần đầu
2. **Mỗi 30 phút** - Scheduled task tự động refresh
3. **Khi cache hết hạn** - Refresh khi user hỏi (nếu cache > 30 phút)

## 💡 Lưu Ý

- ✅ Chỉ lấy sản phẩm có status = `APPROVED`
- ✅ Tự động áp dụng promotion vào giá
- ✅ Cache để giảm số lần query database
- ✅ Format text để AI dễ đọc và hiểu


