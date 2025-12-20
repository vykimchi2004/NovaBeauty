package com.nova_beauty.backend.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.nova_beauty.backend.dto.request.ChatRequest;
import com.nova_beauty.backend.dto.response.ChatResponse;
import com.nova_beauty.backend.dto.response.ProductResponse;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

@Service
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatbotService {

    static final String GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
    static final String SYSTEM_PROMPT_BASE = "Bạn là trợ lý AI chuyên nghiệp của website Nova Beauty - một cửa hàng mỹ phẩm và chăm sóc sắc đẹp uy tín. "
            + "\n\nVAI TRÒ: Hỗ trợ khách hàng nhiệt tình, chuyên nghiệp, thân thiện. Tư vấn sản phẩm, giải đáp thắc mắc về đơn hàng, chính sách, vận chuyển, thanh toán. "
            + "\n\nQUY TẮC VÀNG (TUYỆT ĐỐI PHẢI TUÂN THỦ): "
            + "1. CHỈ tư vấn sản phẩm và danh mục CÓ TRONG CONTEXT được cung cấp (từ database của Nova Beauty). "
            + "2. TUYỆT ĐỐI KHÔNG tự nghĩ ra, tạo ra, hoặc thay đổi bất kỳ tên sản phẩm, danh mục, thương hiệu nào. "
            + "3. TUYỆT ĐỐI KHÔNG gợi ý sản phẩm hoặc danh mục KHÔNG CÓ trong context/database. "
            + "4. Nếu không có thông tin trong context → Nói \"Xin lỗi, hiện tại Nova Beauty chưa có [sản phẩm/danh mục] phù hợp. Bạn có thể xem các sản phẩm khác hoặc liên hệ CSKH để được tư vấn thêm ạ.\" "
            + "\n\nTƯ VẤN SẢN PHẨM (CHỈ DÙNG THÔNG TIN TỪ CONTEXT): "
            + "A. Khi khách hỏi CHUNG (ví dụ: \"có son gì\", \"có kem gì\"): "
            + "   - Nếu context có \"=== DANH MỤC CON CỦA... ===\": "
            + "     + PHẢI copy Y HỆT các dòng danh mục con từ context, giữ nguyên số thứ tự và tên "
            + "     + KHÔNG được thay đổi, rút gọn, hoặc viết lại tên danh mục con "
            + "     + KHÔNG được tự nghĩ ra danh mục con khác "
            + "     + Format: \"Chào bạn! Nova Beauty có các loại [tên danh mục cha từ context] sau:\n\n[Copy Y HỆT các dòng từ context]\n\nBạn muốn xem chi tiết danh mục nào ạ?\" "
            + "   - Nếu KHÔNG có context \"=== DANH MỤC CON CỦA... ===\": "
            + "     + Nói: \"Xin lỗi, tôi không có thông tin về danh mục con của [loại sản phẩm]. Bạn vui lòng liên hệ CSKH để được tư vấn thêm ạ.\" "
            + "B. Khi khách hỏi CỤ THỂ (ví dụ: \"son dior\", \"kem chống nắng la roche\"): "
            + "   - CHỈ liệt kê TÊN sản phẩm CÓ TRONG CONTEXT \"DANH SÁCH SẢN PHẨM LIÊN QUAN\" hoặc \"DANH SÁCH SẢN PHẨM CỦA NOVA BEAUTY\" "
            + "   - KHÔNG được tự nghĩ ra tên sản phẩm, thương hiệu, hoặc thông tin khác "
            + "   - Nếu <20 sản phẩm: liệt kê tất cả TÊN sản phẩm từ context "
            + "   - Nếu >20 sản phẩm: đề xuất lọc theo thương hiệu, giá, loại da, kết cấu (CHỈ dùng thông tin từ context) "
            + "   - Format: \"Chào bạn! Nova Beauty có các sản phẩm [loại] sau:\n\n1. [Tên sản phẩm từ context]\n2. [Tên sản phẩm từ context]\n\nBạn muốn xem chi tiết sản phẩm nào ạ?\" "
            + "C. Khi khách CHỌN sản phẩm: "
            + "   - CHỈ đưa link [LINK:/product/{id}] với ID CÓ TRONG CONTEXT "
            + "   - KHÔNG được tự tạo ID hoặc link "
            + "   - Format: \"Bạn có thể xem chi tiết sản phẩm [tên từ context] tại: [LINK:/product/{id từ context}]\" "
            + "D. Khi không có thông tin chi tiết trong context: "
            + "   - Nói: \"Xin lỗi, tôi không có thông tin chi tiết về [thông tin thiếu]. Bạn vui lòng click vào link sản phẩm để xem chi tiết hoặc liên hệ CSKH để được tư vấn thêm ạ.\" "
            + "\n\nTHÔNG TIN KHUYẾN MÃI/VOUCHER: "
            + "- KHÔNG liệt kê danh sách khuyến mãi "
            + "- Hướng dẫn vào trang Khuyến mãi với link [LINK:/promo] "
            + "- Format: \"Chào bạn! Để xem các chương trình khuyến mãi và voucher đang diễn ra, bạn vui lòng vào trang Khuyến mãi trên website Nova Beauty ạ. Bạn có thể click vào link sau để xem: [LINK:/promo]\" "
            + "\n\nGIỚI HẠN: "
            + "- KHÔNG thể tra cứu đơn hàng cụ thể (cần đăng nhập) "
            + "- KHÔNG thể xử lý khiếu nại/đổi trả cụ thể (cần liên hệ CSKH) "
            + "- KHÔNG có thông tin tài khoản/lịch sử mua hàng (cần đăng nhập) "
            + "- KHÔNG thể thực hiện thanh toán trực tiếp (cần đặt hàng trên website) "
            + "\n\nNGUYÊN TẮC TRẢ LỜI: "
            + "1. Ngắn gọn, rõ ràng, dễ hiểu. "
            + "2. Ngôn ngữ thân thiện, chuyên nghiệp. "
            + "3. CHỈ tư vấn sản phẩm và danh mục CÓ TRONG CONTEXT, KHÔNG thay đổi tên, KHÔNG thêm bớt, KHÔNG tự nghĩ ra. "
            + "4. KHÔNG nói chung chung về website, menu, hoặc hướng dẫn sử dụng website. "
            + "5. Khi không có thông tin trong context: thành thật nói không có, hướng dẫn liên hệ CSKH. "
            + "\n\nQUY TẮC FORMATTING: "
            + "1. TUYỆT ĐỐI KHÔNG dùng markdown: **, ***, *, #, __, ~~, [], () "
            + "2. Chỉ dùng text thuần túy "
            + "3. Liệt kê: dùng số thứ tự (1., 2., 3.) hoặc dấu gạch (-), mỗi mục xuống dòng riêng "
            + "4. Trích dẫn: dùng dấu ngoặc kép \"\" "
            + "\n\nVÍ DỤ: "
            + "Câu hỏi: có son gì "
            + "Trả lời (nếu có context danh mục con): \"Chào bạn! Nova Beauty có các loại Trang điểm môi sau:\n\n1. Son dưỡng môi\n2. Son lì\n3. Son bóng\n\nBạn muốn xem chi tiết danh mục nào ạ?\" "
            + "Câu hỏi: son dior "
            + "Trả lời (nếu có sản phẩm trong context): \"Chào bạn! Nova Beauty có các sản phẩm son sau:\n\n1. Son Dior\n2. Son dưỡng Dior\n\nBạn muốn xem chi tiết sản phẩm nào ạ?\" "
            + "Câu hỏi: tôi chọn số 1 "
            + "Trả lời (nếu có ID trong context): \"Bạn có thể xem chi tiết sản phẩm Son Dior tại: [LINK:/product/abc123]\"";

    final WebClient webClient;
    final String apiKey;
    final String model;
    final ProductService productService;
    final PromotionService promotionService;
    final CategoryService categoryService;

    // Lưu conversation history theo sessionId (có thể mở rộng dùng Redis sau)
    final Map<String, List<GeminiContent>> conversationHistory = new HashMap<>();

    // Cache danh sách sản phẩm (refresh mỗi 30 phút)
    String cachedProductsContext = "";
    long lastProductsCacheUpdate = 0;
    static final long PRODUCTS_CACHE_TTL = 30 * 60 * 1000; // 30 phút

    public ChatbotService(
            WebClient.Builder webClientBuilder,
            ProductService productService,
            PromotionService promotionService,
            CategoryService categoryService,
            @Value("${gemini.apiKey}") String apiKey,
            @Value("${gemini.model}") String model) {
        this.webClient = webClientBuilder
                .baseUrl(GEMINI_API_BASE_URL)
                .build();
        this.productService = productService;
        this.promotionService = promotionService;
        this.categoryService = categoryService;
        this.apiKey = apiKey;
        this.model = model;
        // Load products context lần đầu (chỉ query database, không gọi Gemini API)
        // Comment lại để tránh gọi ngay khi khởi động, chỉ load khi cần
        // refreshProductsContext();
    }

    public ChatResponse ask(ChatRequest request) {
        try {
            // Validate request
            if (request == null || request.getMessage() == null || request.getMessage().isBlank()) {
                log.error("Invalid chat request: message is null or blank");
                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
            }
            
            // Tạo hoặc lấy sessionId
            String sessionId = request.getSessionId();
            if (sessionId == null || sessionId.isBlank()) {
                sessionId = UUID.randomUUID().toString();
            }

            // Lấy conversation history nếu có
            List<GeminiContent> history = conversationHistory.getOrDefault(sessionId, new ArrayList<>());

            // Tạo request body cho Gemini
            GeminiRequest geminiRequest = buildGeminiRequest(request.getMessage(), history);
            
            // Validate Gemini request
            if (geminiRequest == null || geminiRequest.getContents() == null || geminiRequest.getContents().isEmpty()) {
                log.error("Failed to build Gemini request: contents is null or empty");
                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
            }

            // Gọi Gemini API với retry logic cho quota exceeded
            log.debug("Calling Gemini API with model: {}, message length: {}", model, request.getMessage().length());
            
            GeminiResponse response = callGeminiWithRetry(geminiRequest, 3);

            if (response == null) {
                log.error("Gemini API returned null response");
                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
            }
            
            if (response.getCandidates() == null || response.getCandidates().isEmpty()) {
                log.error("Gemini API returned empty candidates. Response: {}", response);
                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
            }

            GeminiContent content = response.getCandidates().get(0).getContent();
            if (content == null || content.getParts() == null || content.getParts().isEmpty()) {
                log.error("Gemini API returned empty parts. Content: {}", content);
                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
            }

            String reply = content.getParts().get(0).getText();
            if (reply == null || reply.isBlank()) {
                log.error("Gemini API returned blank reply");
                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
            }
            
            // Loại bỏ markdown formatting đơn giản (chỉ loại bỏ markers, giữ nguyên nội dung)
            reply = reply.replace("***", "").replace("**", "").replace("*", "");
            
            log.debug("Gemini API response received, reply length: {}", reply.length());

            // Lưu conversation vào history
            history.add(new GeminiContent("user", request.getMessage()));
            history.add(new GeminiContent("model", reply));
            conversationHistory.put(sessionId, history);

            // Giới hạn history để tránh quá dài (giữ 10 cặp Q&A gần nhất)
            if (history.size() > 20) {
                history.subList(0, history.size() - 20).clear();
            }

            return ChatResponse.builder()
                    .reply(reply)
                    .sessionId(sessionId)
                    .build();

        } catch (WebClientResponseException e) {
            log.error("Error calling Gemini API: status={}, message={}, body={}", 
                e.getStatusCode(), e.getMessage(), e.getResponseBodyAsString(), e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } catch (AppException e) {
            // Re-throw AppException để giữ nguyên error code
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error in chatbot service: message={}, class={}", 
                e.getMessage(), e.getClass().getName(), e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    private GeminiRequest buildGeminiRequest(String userMessage, List<GeminiContent> history) {
        List<GeminiContent> contents = new ArrayList<>();

        // Refresh products context nếu cần (trong transaction riêng)
        try {
            refreshProductsContextIfNeeded();
        } catch (Exception e) {
            log.warn("Failed to refresh context, using cached: {}", e.getMessage());
        }

        // Tạo system prompt với thông tin sản phẩm
        // CHỈ thêm products context nếu câu hỏi thực sự liên quan đến sản phẩm (không phải chào hỏi)
        String systemPrompt = SYSTEM_PROMPT_BASE;
        
        // Kiểm tra xem câu hỏi có phải là chào hỏi không
        if (!isGreetingMessage(userMessage) && isProductRelatedQuestion(userMessage)) {
            // Chỉ lấy products context nếu câu hỏi liên quan đến sản phẩm
            String productsContext = getProductsContextForMessage(userMessage);
            if (!productsContext.isEmpty() && !productsContext.contains("chưa có sản phẩm")) {
                systemPrompt += "\n\n" + productsContext;
            }
        }

        // Nếu chưa có history, thêm system prompt vào đầu conversation
        if (history.isEmpty()) {
            String fullPrompt = systemPrompt + "\n\nCâu hỏi của khách hàng: " + userMessage;
            contents.add(new GeminiContent("user", fullPrompt));
        } else {
            // Nếu đã có history, chỉ thêm products context vào message hiện tại nếu cần
            // Thêm conversation history
            contents.addAll(history);
            // Thêm message hiện tại với context sản phẩm nếu cần
            String messageWithContext = userMessage;
            // Nếu user hỏi về sản phẩm và có context, thêm vào
            if (!isGreetingMessage(userMessage) && isProductRelatedQuestion(userMessage)) {
                String productsContext = getProductsContextForMessage(userMessage);
                if (!productsContext.isEmpty() && !productsContext.contains("chưa có sản phẩm")) {
                    messageWithContext = "Thông tin sản phẩm hiện có:\n" + productsContext 
                        + "\n\nCâu hỏi của khách hàng: " + userMessage;
                }
            }
            contents.add(new GeminiContent("user", messageWithContext));
        }

        // Validate contents trước khi tạo request
        if (contents == null || contents.isEmpty()) {
            log.error("Cannot build Gemini request: contents is null or empty");
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
        
        // Validate từng content
        for (GeminiContent content : contents) {
            if (content == null || content.getParts() == null || content.getParts().isEmpty()) {
                log.error("Invalid Gemini content: content or parts is null/empty");
                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
            }
            for (GeminiPart part : content.getParts()) {
                if (part == null || part.getText() == null || part.getText().isBlank()) {
                    log.error("Invalid Gemini part: part or text is null/blank");
                    throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
                }
            }
        }
        
        GeminiRequest request = new GeminiRequest();
        request.setContents(contents);
        
        log.debug("Built Gemini request with {} contents, first message length: {}", 
            contents.size(), 
            contents.isEmpty() ? 0 : contents.get(0).getParts().get(0).getText().length());
        
        return request;
    }

    /**
     * Kiểm tra xem câu hỏi có phải là chào hỏi không
     */
    private boolean isGreetingMessage(String message) {
        String lowerMessage = message.toLowerCase().trim();
        String[] greetingKeywords = {
            "hi", "hello", "xin chào", "chào", "chào bạn", "chào anh", "chào chị",
            "hey", "hế lô", "hế lô", "alo", "alo alo",
            "good morning", "good afternoon", "good evening",
            "chào buổi sáng", "chào buổi chiều", "chào buổi tối"
        };
        for (String keyword : greetingKeywords) {
            if (lowerMessage.equals(keyword) || lowerMessage.startsWith(keyword + " ") 
                || lowerMessage.startsWith(keyword + ",") || lowerMessage.startsWith(keyword + ".")) {
                return true;
            }
        }
        return false;
    }

    /**
     * Kiểm tra xem câu hỏi có liên quan đến sản phẩm không
     */
    private boolean isProductRelatedQuestion(String message) {
        String lowerMessage = message.toLowerCase();
        String[] productKeywords = {
            "sản phẩm", "mỹ phẩm", "kem", "son", "nước hoa", "dưỡng da",
            "trang điểm", "chăm sóc", "tư vấn", "giá", "giá bao nhiêu",
            "có sản phẩm", "bán", "mua", "loại da", "kết cấu", "thương hiệu",
            "brand", "skincare", "makeup", "perfume", "hair care"
        };
        for (String keyword : productKeywords) {
            if (lowerMessage.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Lấy context về sản phẩm để đưa vào prompt
     * Ưu tiên trả về danh mục con nếu câu hỏi chung, trả về sản phẩm nếu câu hỏi cụ thể
     */
    private String getProductsContextForMessage(String userMessage) {
        // Extract keywords từ user message
        String[] productKeywords = extractProductKeywords(userMessage);
        
        if (productKeywords.length == 0) {
            return "";
        }
        
        // Kiểm tra xem câu hỏi có cụ thể không (có brand/tên sản phẩm)
        boolean isSpecific = isSpecificProductQuestion(userMessage);
        
        if (!isSpecific) {
            // Câu hỏi chung: ưu tiên trả về danh mục con
            // Lấy keyword đầu tiên để tìm danh mục con
            String mainKeyword = productKeywords[0];
            String subCategoriesContext = getSubCategoriesContext(mainKeyword);
            if (!subCategoriesContext.isEmpty()) {
                log.debug("Returning subcategories for keyword: {}", mainKeyword);
                return subCategoriesContext;
            }
        }
        
        // Câu hỏi cụ thể hoặc không tìm thấy danh mục con: trả về sản phẩm
        log.debug("Returning products for keywords: {}", String.join(", ", productKeywords));
        return getFilteredProductsContext(productKeywords);
    }

    /**
     * Kiểm tra xem câu hỏi có cụ thể không (có brand/tên sản phẩm)
     * Ví dụ: "son dior" = cụ thể, "có son gì" = chung
     */
    private boolean isSpecificProductQuestion(String message) {
        String lowerMessage = message.toLowerCase();
        
        // Nếu có brand hoặc tên sản phẩm cụ thể
        String[] brands = {
            "dior", "chanel", "gucci", "ysl", "mac", "maybelline", 
            "l'oreal", "loreal", "revlon", "clinique", "estee lauder",
            "shiseido", "laneige", "innisfree", "the face shop",
            "skii", "la mer", "kiehl", "origins", "fresh"
        };
        
        for (String brand : brands) {
            if (lowerMessage.contains(brand)) {
                return true;
            }
        }
        
        // Nếu có từ khóa chỉ định cụ thể
        String[] specificKeywords = {
            "tôi muốn", "tôi cần", "cho tôi", "tìm", "mua",
            "giá", "bao nhiêu", "có bán", "bán không"
        };
        
        for (String keyword : specificKeywords) {
            if (lowerMessage.contains(keyword)) {
                return true;
            }
        }
        
        // Nếu câu hỏi chung (có son gì, có kem gì)
        String[] generalKeywords = {
            "có gì", "có những gì", "có loại gì", "có những loại",
            "có những sản phẩm", "có sản phẩm gì"
        };
        
        for (String keyword : generalKeywords) {
            if (lowerMessage.contains(keyword)) {
                return false; // Câu hỏi chung
            }
        }
        
        // Mặc định: nếu không rõ, coi như câu hỏi chung
        return false;
    }

    /**
     * Mapping từ keyword phổ biến sang tên category
     */
    private String mapKeywordToCategoryName(String keyword) {
        String lowerKeyword = keyword.toLowerCase();
        
        // Mapping các keyword phổ biến sang tên category
        java.util.Map<String, String> keywordMapping = new java.util.HashMap<>();
        keywordMapping.put("son", "Trang điểm môi");
        keywordMapping.put("son môi", "Trang điểm môi");
        keywordMapping.put("lipstick", "Trang điểm môi");
        keywordMapping.put("lip", "Trang điểm môi");
        keywordMapping.put("kem", "Chăm sóc da");
        keywordMapping.put("kem dưỡng", "Chăm sóc da");
        keywordMapping.put("moisturizer", "Chăm sóc da");
        keywordMapping.put("cream", "Chăm sóc da");
        keywordMapping.put("nước hoa", "Nước hoa");
        keywordMapping.put("perfume", "Nước hoa");
        keywordMapping.put("fragrance", "Nước hoa");
        keywordMapping.put("dưỡng tóc", "Chăm sóc tóc");
        keywordMapping.put("hair care", "Chăm sóc tóc");
        keywordMapping.put("shampoo", "Chăm sóc tóc");
        keywordMapping.put("dầu gội", "Chăm sóc tóc");
        
        // Kiểm tra mapping trực tiếp
        if (keywordMapping.containsKey(lowerKeyword)) {
            return keywordMapping.get(lowerKeyword);
        }
        
        // Kiểm tra keyword có chứa trong mapping key không
        for (java.util.Map.Entry<String, String> entry : keywordMapping.entrySet()) {
            if (lowerKeyword.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        
        return null; // Không có mapping
    }

    /**
     * Lấy context về danh mục con để chatbot hỏi lại khách hàng
     */
    @Transactional(readOnly = true)
    private String getSubCategoriesContext(String keyword) {
        try {
            // Tìm category chính theo keyword
            java.util.List<com.nova_beauty.backend.dto.response.CategoryResponse> categories = categoryService.getAllCategories();
            
            com.nova_beauty.backend.dto.response.CategoryResponse mainCategory = null;
            String lowerKeyword = keyword.toLowerCase();
            
            // Bước 1: Thử mapping keyword sang tên category
            String mappedCategoryName = mapKeywordToCategoryName(keyword);
            if (mappedCategoryName != null) {
                for (com.nova_beauty.backend.dto.response.CategoryResponse cat : categories) {
                    if (cat.getName() != null && cat.getName().equals(mappedCategoryName)) {
                        mainCategory = cat;
                        log.debug("Found category via mapping: {} for keyword: {}", mainCategory.getName(), keyword);
                        break;
                    }
                }
            }
            
            // Bước 2: Nếu chưa tìm thấy, tìm category có tên chứa keyword hoặc keyword chứa trong tên category
            // Ưu tiên exact match, sau đó là contains
            if (mainCategory == null) {
                // Ưu tiên 1: Exact match (không phân biệt hoa thường)
                for (com.nova_beauty.backend.dto.response.CategoryResponse cat : categories) {
                    if (cat.getName() != null && cat.getName().toLowerCase().equals(lowerKeyword)) {
                        mainCategory = cat;
                        break;
                    }
                }
            }
            
            if (mainCategory == null) {
                // Ưu tiên 2: Category name contains keyword
                for (com.nova_beauty.backend.dto.response.CategoryResponse cat : categories) {
                    if (cat.getName() != null && cat.getName().toLowerCase().contains(lowerKeyword)) {
                        mainCategory = cat;
                        break;
                    }
                }
            }
            
            if (mainCategory == null) {
                // Ưu tiên 3: Keyword contains category name (ví dụ: "son môi" chứa "son")
                for (com.nova_beauty.backend.dto.response.CategoryResponse cat : categories) {
                    if (cat.getName() != null && lowerKeyword.contains(cat.getName().toLowerCase())) {
                        mainCategory = cat;
                        break;
                    }
                }
            }
            
            if (mainCategory == null) {
                log.debug("No category found for keyword: {}", keyword);
                return ""; // Không tìm thấy category, để chatbot tự xử lý
            }
            
            // Nếu category tìm được có parent (là category con), tìm category cha
            if (mainCategory.getParentId() != null && !mainCategory.getParentId().isEmpty()) {
                // Tìm category cha
                for (com.nova_beauty.backend.dto.response.CategoryResponse cat : categories) {
                    if (cat.getId() != null && cat.getId().equals(mainCategory.getParentId())) {
                        mainCategory = cat;
                        log.debug("Using parent category: {} for keyword: {}", mainCategory.getName(), keyword);
                        break;
                    }
                }
            }
            
            log.debug("Found category: {} for keyword: {}", mainCategory.getName(), keyword);
            
            // Lấy danh mục con (chỉ lấy danh mục active)
            java.util.List<com.nova_beauty.backend.dto.response.CategoryResponse> subCategories = categoryService.getSubCategories(mainCategory.getId());
            
            // Filter chỉ lấy danh mục active
            subCategories = subCategories.stream()
                .filter(cat -> cat.getStatus() != null && cat.getStatus())
                .collect(java.util.stream.Collectors.toList());
            
            if (subCategories == null || subCategories.isEmpty()) {
                log.debug("No subcategories found for category: {}", mainCategory.getName());
                return ""; // Không có danh mục con, để chatbot tự xử lý
            }
            
            log.debug("Found {} subcategories for category: {}", subCategories.size(), mainCategory.getName());
            
            // Format context về danh mục con - format rõ ràng để chatbot dễ nhận biết
            StringBuilder context = new StringBuilder();
            context.append("=== DANH MỤC CON CỦA ").append(mainCategory.getName().toUpperCase()).append(" ===\n");
            context.append("TUYỆT ĐỐI CHỈ LIỆT KÊ ĐÚNG Y HỆT CÁC DANH MỤC CON SAU, KHÔNG TỰ NGHĨ RA, KHÔNG THAY ĐỔI TÊN, KHÔNG RÚT GỌN:\n\n");
            
            for (int i = 0; i < subCategories.size(); i++) {
                com.nova_beauty.backend.dto.response.CategoryResponse subCat = subCategories.get(i);
                context.append(String.format("%d. %s", i + 1, subCat.getName()));
                if (subCat.getProductCount() != null && subCat.getProductCount() > 0) {
                    context.append(String.format(" (%d sản phẩm)", subCat.getProductCount()));
                }
                context.append("\n");
            }
            
            context.append("\n");
            context.append("QUY TẮC BẮT BUỘC KHI TRẢ LỜI:\n");
            context.append("- PHẢI copy Y HỆT các dòng danh mục con trên (từ số thứ tự đến tên)\n");
            context.append("- KHÔNG được thay đổi, rút gọn, hoặc viết lại tên danh mục con\n");
            context.append("- KHÔNG được tự nghĩ ra danh mục con khác\n");
            context.append("- Ví dụ: Nếu context có \"1. Son dưỡng môi\", PHẢI viết đúng \"1. Son dưỡng môi\", KHÔNG được viết \"1. Son dưỡng\" hoặc \"1. Son\"\n");
            context.append("- Nếu không có context này, KHÔNG được tự nghĩ ra danh mục con\n");
            
            return context.toString();
        } catch (Exception e) {
            log.error("Error getting subcategories context for keyword: {}", keyword, e);
            return "";
        }
    }

    /**
     * Lấy context về sản phẩm để đưa vào prompt (không filter)
     */
    private String getProductsContext() {
        if (cachedProductsContext.isEmpty()) {
            refreshProductsContext();
        }
        return cachedProductsContext;
    }

    /**
     * Extract keywords từ user message để filter sản phẩm
     * Trả về array các keywords như: ["son", "kem", "nước hoa"]
     */
    private String[] extractProductKeywords(String message) {
        String lowerMessage = message.toLowerCase();
        java.util.List<String> keywords = new java.util.ArrayList<>();
        
        // Danh sách keywords phổ biến
        String[] commonKeywords = {
            "son", "son môi", "lipstick", "lip",
            "kem", "kem dưỡng", "cream", "moisturizer",
            "nước hoa", "perfume", "fragrance",
            "serum", "tinh chất",
            "toner", "nước hoa hồng",
            "sữa rửa mặt", "cleanser", "face wash",
            "mặt nạ", "mask",
            "chống nắng", "sunscreen", "spf",
            "trang điểm", "makeup", "foundation", "bb cream", "cc cream",
            "mascara", "phấn mắt", "eyeshadow",
            "dưỡng tóc", "hair care", "shampoo", "dầu gội",
            "dưỡng thể", "body care", "body lotion"
        };
        
        for (String keyword : commonKeywords) {
            if (lowerMessage.contains(keyword)) {
                keywords.add(keyword);
            }
        }
        
        return keywords.toArray(new String[0]);
    }

    /**
     * Lấy context sản phẩm đã filter theo keywords
     */
    @Transactional(readOnly = true)
    private String getFilteredProductsContext(String[] keywords) {
        try {
            java.util.Set<String> allProductIds = new java.util.HashSet<>();
            java.util.List<com.nova_beauty.backend.dto.response.ProductResponse> allProducts = new java.util.ArrayList<>();
            
            // Search sản phẩm theo từng keyword
            for (String keyword : keywords) {
                java.util.List<com.nova_beauty.backend.dto.response.ProductResponse> products = productService.searchProducts(keyword);
                for (com.nova_beauty.backend.dto.response.ProductResponse product : products) {
                    // Tránh duplicate
                    if (!allProductIds.contains(product.getId())) {
                        allProductIds.add(product.getId());
                        allProducts.add(product);
                    }
                }
            }
            
            if (allProducts.isEmpty()) {
                return "Không tìm thấy sản phẩm nào liên quan đến: " + String.join(", ", keywords);
            }
            
            // Format context (giới hạn 50 sản phẩm để tránh prompt quá dài)
            int maxProducts = Math.min(50, allProducts.size());
            StringBuilder context = new StringBuilder();
            context.append("DANH SÁCH SẢN PHẨM LIÊN QUAN:\n\n");
            
            // Thu thập thông tin để đề xuất lọc nếu có nhiều sản phẩm
            java.util.Set<String> brands = new java.util.HashSet<>();
            java.util.Set<String> skinTypes = new java.util.HashSet<>();
            java.util.Set<String> textures = new java.util.HashSet<>();
            java.util.List<Double> prices = new java.util.ArrayList<>();
            
            for (int i = 0; i < maxProducts; i++) {
                com.nova_beauty.backend.dto.response.ProductResponse product = allProducts.get(i);
                
                // Format: ID, Tên, và các thông tin để lọc
                context.append(String.format("%d. ID: %s | Tên: %s", i + 1, product.getId(), product.getName()));
                
                if (product.getBrand() != null && !product.getBrand().isEmpty()) {
                    context.append(String.format(" | Thương hiệu: %s", product.getBrand()));
                    brands.add(product.getBrand());
                }
                
                if (product.getPrice() != null) {
                    context.append(String.format(" | Giá: %,.0f VNĐ", product.getPrice()));
                    prices.add(product.getPrice());
                }
                
                if (product.getSkinType() != null && !product.getSkinType().isEmpty()) {
                    context.append(String.format(" | Loại da: %s", product.getSkinType()));
                    skinTypes.add(product.getSkinType());
                }
                
                if (product.getTexture() != null && !product.getTexture().isEmpty()) {
                    context.append(String.format(" | Kết cấu: %s", product.getTexture()));
                    textures.add(product.getTexture());
                }
                
                context.append("\n");
            }
            
            if (allProducts.size() > maxProducts) {
                context.append(String.format("... và còn %d sản phẩm khác.\n", allProducts.size() - maxProducts));
            }
            
            // Thêm thông tin để đề xuất lọc nếu có nhiều sản phẩm
            if (allProducts.size() > 20) {
                context.append("\nTHÔNG TIN ĐỂ ĐỀ XUẤT LỌC:\n");
                if (!brands.isEmpty()) {
                    context.append("Thương hiệu có sẵn: ").append(String.join(", ", brands)).append("\n");
                }
                if (!skinTypes.isEmpty()) {
                    context.append("Loại da có sẵn: ").append(String.join(", ", skinTypes)).append("\n");
                }
                if (!textures.isEmpty()) {
                    context.append("Kết cấu có sẵn: ").append(String.join(", ", textures)).append("\n");
                }
                if (!prices.isEmpty()) {
                    double minPrice = prices.stream().mapToDouble(Double::doubleValue).min().orElse(0);
                    double maxPrice = prices.stream().mapToDouble(Double::doubleValue).max().orElse(0);
                    context.append(String.format("Khoảng giá: %,.0f VNĐ - %,.0f VNĐ\n", minPrice, maxPrice));
                }
            }
            
            return context.toString();
        } catch (Exception e) {
            log.warn("Error filtering products context: {}", e.getMessage());
            // Fallback về cached context nếu có lỗi
            return getProductsContext();
        }
    }

    /**
     * Refresh products context nếu cần
     */
    private void refreshProductsContextIfNeeded() {
        long now = System.currentTimeMillis();
        if (now - lastProductsCacheUpdate > PRODUCTS_CACHE_TTL) {
            refreshProductsContext();
        }
    }

    /**
     * Load và format danh sách sản phẩm thành context
     */
    @Transactional(readOnly = true)
    private void refreshProductsContext() {
        try {
            // Sử dụng method riêng để load đầy đủ relationships, tránh LazyInitializationException
            List<ProductResponse> products = productService.getActiveProductsForChatbot();
            
            if (products.isEmpty()) {
                cachedProductsContext = "Hiện tại chưa có sản phẩm nào trong hệ thống.";
                return;
            }

            // Format thành text context (giới hạn 100 sản phẩm đầu để tránh prompt quá dài)
            int maxProducts = Math.min(100, products.size());
            StringBuilder context = new StringBuilder();
            context.append("DANH SÁCH SẢN PHẨM CỦA NOVA BEAUTY:\n\n");

            for (int i = 0; i < maxProducts; i++) {
                ProductResponse product = products.get(i);
                
                // Format: ID, Tên, và các thông tin để lọc
                context.append(String.format("%d. ID: %s | Tên: %s", i + 1, product.getId(), product.getName()));
                
                if (product.getCategoryName() != null && !product.getCategoryName().isEmpty()) {
                    context.append(String.format(" | Danh mục: %s", product.getCategoryName()));
                }
                
                if (product.getBrand() != null && !product.getBrand().isEmpty()) {
                    context.append(String.format(" | Thương hiệu: %s", product.getBrand()));
                }
                
                if (product.getPrice() != null) {
                    context.append(String.format(" | Giá: %,.0f VNĐ", product.getPrice()));
                }
                
                if (product.getSkinType() != null && !product.getSkinType().isEmpty()) {
                    context.append(String.format(" | Loại da: %s", product.getSkinType()));
                }
                
                if (product.getTexture() != null && !product.getTexture().isEmpty()) {
                    context.append(String.format(" | Kết cấu: %s", product.getTexture()));
                }
                
                context.append("\n");
            }

            if (products.size() > maxProducts) {
                context.append(String.format("... và còn %d sản phẩm khác.\n", products.size() - maxProducts));
            }

            cachedProductsContext = context.toString();
            lastProductsCacheUpdate = System.currentTimeMillis();
            
            log.info("Refreshed products context: {} products", products.size());
        } catch (Exception e) {
            log.error("Error refreshing products context: {}", e.getMessage(), e);
            cachedProductsContext = "Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.";
        }
    }

    /**
     * Gọi Gemini API với retry logic cho quota exceeded
     * LƯU Ý: Khi gặp 429, chỉ retry nếu KHÔNG phải limit = 0
     */
    private GeminiResponse callGeminiWithRetry(GeminiRequest request, int maxRetries) {
        int retryCount = 0;
        long baseDelayMs = 2000; // 2 giây base delay
        
        while (retryCount <= maxRetries) {
            try {
                GeminiResponse response = webClient.post()
                        .uri(uriBuilder -> uriBuilder
                                .path("/models/{model}:generateContent")
                                .queryParam("key", apiKey)
                                .build(model))
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(request)
                        .retrieve()
                        .onStatus(HttpStatusCode::isError, clientResponse -> {
                            int statusCode = clientResponse.statusCode().value();
                            return clientResponse.bodyToMono(String.class)
                                .flatMap(body -> {
                                    // Xử lý 429 với limit = 0 ngay trong onStatus handler - không retry
                                    // Kiểm tra cả "limit": 0 và limit: 0 (có/không có quotes)
                                    // Cũng kiểm tra trong error message text
                                    boolean isLimitZero = body != null && (
                                        body.contains("\"limit\": 0") || 
                                        body.contains("limit: 0") ||
                                        body.contains("\"limit\":0") ||
                                        body.contains("limit:0") ||
                                        body.contains("limit: 0,") ||
                                        body.contains("limit:0,") ||
                                        body.matches(".*limit:\\s*0[,\\s].*") // Regex pattern
                                    );
                                    if (statusCode == 429 && isLimitZero) {
                                        log.error("================================================");
                                        log.error("Gemini API quota limit is 0 - STOPPING ALL RETRIES");
                                        log.error("Possible reasons:");
                                        log.error("1. Vietnam tier restriction - API key may be restricted for Vietnam region");
                                        log.error("2. API key leaked - Someone else may be using your API key");
                                        log.error("3. Account restrictions - Check your Google Cloud account status");
                                        log.error("Solution: Create a new API key and keep it secure. Do not share it publicly.");
                                        log.error("Error body: {}", body);
                                        log.error("================================================");
                                        // Throw AppException để không retry
                                        return Mono.error(new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));
                                    }
                                    
                                    // Log các lỗi khác nhưng vẫn throw WebClientResponseException để catch block xử lý
                                    if (statusCode == 429) {
                                        log.warn("Gemini API quota exceeded, will retry: {}", body);
                                    } else if (statusCode == 404) {
                                        log.error("Gemini API model not found: {}. Error body: {}", model, body);
                                    } else if (statusCode == 400) {
                                        log.error("Gemini API BadRequest (400). Error body: {}", body);
                                    } else {
                                        log.error("Gemini API error: status={}, body={}", statusCode, body);
                                    }
                                    
                                    // Throw WebClientResponseException để catch block có thể xử lý retry
                                    return Mono.error(WebClientResponseException.create(
                                        statusCode,
                                        clientResponse.statusCode().toString(),
                                        clientResponse.headers().asHttpHeaders(),
                                        body != null ? body.getBytes() : null,
                                        null
                                    ));
                                });
                        })
                        .bodyToMono(GeminiResponse.class)
                        .block();
                
                return response;
                
            } catch (WebClientResponseException e) {
                int statusCode = e.getStatusCode().value();
                String errorBody = e.getResponseBodyAsString();
                
                // 400 BadRequest: Không retry - lỗi format request
                if (statusCode == 400) {
                    log.error("Gemini API BadRequest (400). This usually means:");
                    log.error("1. Request body format is invalid");
                    log.error("2. Missing required fields");
                    log.error("3. Invalid parameter values");
                    log.error("Error body: {}", errorBody);
                    throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
                }
                
                // 404 NotFound: Không retry - model không tồn tại
                if (statusCode == 404) {
                    log.error("Gemini API NotFound (404). Model '{}' is not found or not available.", model);
                    log.error("Available models: gemini-2.0-flash, gemini-1.5-flash, gemini-pro, gemini-1.5-pro");
                    log.error("Error body: {}", errorBody);
                    log.error("Solution: Update 'gemini.model' in application.yaml to a valid model name");
                    throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
                }
                
                // 429 TooManyRequests: Retry với logic đặc biệt
                if (statusCode == 429) {
                    // Kiểm tra nếu limit = 0 (Vietnam tier restriction hoặc API key bị leak)
                    // Kiểm tra cả "limit": 0 và limit: 0 (có/không có quotes)
                    // Cũng kiểm tra trong error message text
                    boolean isLimitZero = errorBody != null && (
                        errorBody.contains("\"limit\": 0") || 
                        errorBody.contains("limit: 0") ||
                        errorBody.contains("\"limit\":0") ||
                        errorBody.contains("limit:0") ||
                        errorBody.contains("limit: 0,") ||
                        errorBody.contains("limit:0,") ||
                        errorBody.matches(".*limit:\\s*0[,\\s].*") // Regex pattern
                    );
                    if (isLimitZero) {
                        log.error("================================================");
                        log.error("Gemini API quota limit is 0 - STOPPING ALL RETRIES");
                        log.error("Possible reasons:");
                        log.error("1. Vietnam tier restriction - API key may be restricted for Vietnam region");
                        log.error("2. API key leaked - Someone else may be using your API key");
                        log.error("3. Account restrictions - Check your Google Cloud account status");
                        log.error("Solution: Create a new API key and keep it secure. Do not share it publicly.");
                        log.error("Error body: {}", errorBody);
                        log.error("================================================");
                        throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
                    }
                    
                    // Nếu không phải limit = 0, nhưng vẫn là 429, KHÔNG retry để tránh spam
                    // Chỉ log và throw error
                    log.error("Gemini API quota exceeded (429). NOT retrying to avoid quota abuse.");
                    log.error("Please wait for quota reset or check your quota at: https://ai.dev/usage?tab=rate-limit");
                    log.error("Error body: {}", errorBody);
                    throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
                }
                
                // Các lỗi khác: Không retry
                log.error("Gemini API error: status={}, body={}", statusCode, errorBody);
                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
            }
        }
        
        throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
    }

    /**
     * Scheduled task để refresh products context định kỳ (mỗi 30 phút)
     * LƯU Ý: Method này chỉ query database, KHÔNG gọi Gemini API
     */
    @Scheduled(fixedRate = PRODUCTS_CACHE_TTL)
    public void scheduledRefreshProductsContext() {
        // Chỉ refresh products context từ database, không gọi Gemini API
        refreshProductsContext();
    }

    // Inner classes cho Gemini API request/response
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    static class GeminiRequest {
        @JsonProperty("contents")
        List<GeminiContent> contents;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    static class GeminiContent {
        @JsonProperty("role")
        String role; // "user" hoặc "model"
        @JsonProperty("parts")
        List<GeminiPart> parts;

        GeminiContent(String role, String text) {
            this.role = role;
            this.parts = List.of(new GeminiPart(text));
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    static class GeminiPart {
        @JsonProperty("text")
        String text;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    static class GeminiResponse {
        @JsonProperty("candidates")
        List<GeminiCandidate> candidates;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    static class GeminiCandidate {
        @JsonProperty("content")
        GeminiContent content;
    }
}

