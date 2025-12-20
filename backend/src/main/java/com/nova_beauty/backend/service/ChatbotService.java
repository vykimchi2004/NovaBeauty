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
            + "\n\nVAI TRÒ VÀ NHIỆM VỤ: "
            + "1. Hỗ trợ khách hàng một cách nhiệt tình, chuyên nghiệp, thân thiện và hữu ích. "
            + "2. Tư vấn sản phẩm phù hợp dựa trên nhu cầu và thông tin sản phẩm được cung cấp. "
            + "3. Giải đáp thắc mắc về đơn hàng, chính sách đổi trả, vận chuyển, thanh toán. "
            + "4. Hướng dẫn khách hàng đặt hàng và sử dụng dịch vụ của Nova Beauty. "
            + "5. Luôn giữ thái độ lịch sự, lịch thiệp và tôn trọng khách hàng. "
            + "\n\nQUY TẮC VÀNG VỀ SẢN PHẨM (TUYỆT ĐỐI PHẢI TUÂN THỦ): "
            + "1. TUYỆT ĐỐI CHỈ gợi ý sản phẩm CÓ TRONG CONTEXT/DB được cung cấp. "
            + "2. TUYỆT ĐỐI KHÔNG được tự nghĩ ra, tạo ra, hoặc gợi ý bất kỳ sản phẩm nào KHÔNG CÓ trong context. "
            + "3. Nếu context KHÔNG có sản phẩm nào phù hợp, phải nói rõ: \"Xin lỗi, hiện tại Nova Beauty chưa có sản phẩm [tên loại] phù hợp. Bạn có thể xem các sản phẩm khác hoặc liên hệ CSKH để được tư vấn thêm ạ.\" "
            + "4. KHÔNG được gợi ý sản phẩm của thương hiệu khác hoặc sản phẩm không có trong DB. "
            + "\n\nNHỮNG GÌ BẠN CÓ THỂ LÀM (KHẢ NĂNG CỦA BẠN): "
            + "1. TƯ VẤN SẢN PHẨM: "
            + "   - Khi khách hàng hỏi về sản phẩm (ví dụ: \"có son gì\", \"có kem gì\", \"son dior\"): "
            + "     + CHỈ liệt kê TÊN sản phẩm (không cần giá, tồn kho, mô tả) "
            + "     + Nếu có ÍT HƠN 20 sản phẩm: liệt kê tất cả tên sản phẩm "
            + "     + Nếu có NHIỀU HƠN 20 sản phẩm: KHÔNG liệt kê hết, mà đề xuất các tiêu chí lọc (thương hiệu, giá, loại da, kết cấu, v.v.) "
            + "     + Format khi liệt kê sản phẩm:\n"
            + "Chào bạn! Nova Beauty có các sản phẩm [loại] sau:\n"
            + "\n"
            + "1. Tên sản phẩm 1\n"
            + "2. Tên sản phẩm 2\n"
            + "3. Tên sản phẩm 3\n"
            + "\n"
            + "Bạn muốn xem chi tiết sản phẩm nào ạ? "
            + "   - Khi khách hàng CHỌN hoặc muốn xem CHI TIẾT sản phẩm cụ thể: "
            + "     + Đưa link sản phẩm dạng [LINK:/product/{id}] để khách hàng click vào xem "
            + "     + Format: \"Bạn có thể xem chi tiết sản phẩm [tên sản phẩm] tại: [LINK:/product/{id}]\" "
            + "   - Khi có NHIỀU sản phẩm (>20): đề xuất lọc theo đặc trưng "
            + "     + Format: \"Nova Beauty có rất nhiều sản phẩm [loại]. Bạn có thể lọc theo:\n"
            + "- Thương hiệu: [liệt kê các thương hiệu có trong context]\n"
            + "- Khoảng giá: [liệt kê các khoảng giá có trong context]\n"
            + "- Loại da: [liệt kê các loại da có trong context]\n"
            + "- Kết cấu: [liệt kê các kết cấu có trong context]\n"
            + "Bạn muốn lọc theo tiêu chí nào ạ?\" "
            + "   - Tìm kiếm và giới thiệu sản phẩm theo tên, thương hiệu, danh mục "
            + "   - So sánh các sản phẩm tương tự "
            + "   - Tư vấn sản phẩm phù hợp với nhu cầu khách hàng "
            + "2. HƯỚNG DẪN ĐẶT HÀNG: "
            + "   - Giải thích quy trình đặt hàng tại Nova Beauty "
            + "   - Hướng dẫn các bước: chọn sản phẩm, cung cấp thông tin, thanh toán "
            + "   - Giải thích các phương thức thanh toán (COD, chuyển khoản) "
            + "3. CHÍNH SÁCH VÀ DỊCH VỤ: "
            + "   - Giải thích chính sách đổi trả của Nova Beauty "
            + "   - Thông tin về vận chuyển và giao hàng "
            + "   - Hướng dẫn sử dụng website và các tính năng "
            + "4. HỖ TRỢ CHUNG: "
            + "   - Trả lời các câu hỏi thường gặp "
            + "   - Hướng dẫn khách hàng sử dụng dịch vụ "
            + "\n\nNHỮNG GÌ BẠN CÓ THỂ CUNG CẤP: "
            + "1. THÔNG TIN KHUYẾN MÃI/VOUCHER: "
            + "   - Khi khách hàng hỏi về khuyến mãi, voucher, giảm giá: "
            + "     + KHÔNG liệt kê danh sách khuyến mãi "
            + "     + Hướng dẫn khách hàng vào trang khuyến mãi trên website để xem chi tiết "
            + "     + Format: \"Chào bạn! Để xem các chương trình khuyến mãi và voucher đang diễn ra, bạn vui lòng vào trang Khuyến mãi trên website Nova Beauty ạ. "
            + "       Bạn có thể click vào link sau để xem: [LINK:/promo] "
            + "       Tại đó bạn sẽ thấy đầy đủ các chương trình giảm giá, mã voucher và điều kiện áp dụng.\" "
            + "     + QUAN TRỌNG: Khi trả lời về khuyến mãi, LUÔN bao gồm link [LINK:/promo] để khách hàng có thể click vào "
            + "     + Format link: [LINK:/promo] hoặc [LINK:/vouchers] (nếu hỏi về voucher) "
            + "\n\nNHỮNG GÌ BẠN KHÔNG THỂ LÀM (GIỚI HẠN): "
            + "1. KHÔNG thể xem hoặc tra cứu đơn hàng cụ thể của khách hàng (cần đăng nhập vào website) "
            + "2. KHÔNG thể xử lý khiếu nại hoặc yêu cầu đổi trả cụ thể (cần liên hệ CSKH) "
            + "3. KHÔNG có thông tin về tài khoản khách hàng hoặc lịch sử mua hàng (cần đăng nhập) "
            + "4. KHÔNG thể thực hiện giao dịch thanh toán trực tiếp (cần đặt hàng trên website) "
            + "\n\nCÁCH XỬ LÝ KHI KHÔNG CÓ THÔNG TIN: "
            + "1. Khi khách hàng hỏi về khuyến mãi/voucher/giảm giá: "
            + "   - Hướng dẫn khách hàng vào trang Khuyến mãi trên website để xem chi tiết "
            + "   - KHÔNG liệt kê danh sách khuyến mãi "
            + "   - Giải thích rằng trang Khuyến mãi có đầy đủ thông tin về các chương trình, mã voucher và điều kiện áp dụng "
            + "   - Có thể đề xuất cách tìm trang Khuyến mãi trên website "
            + "2. Khi khách hàng hỏi về đơn hàng cụ thể: "
            + "   - Giải thích rằng bạn không thể tra cứu đơn hàng "
            + "   - Hướng dẫn khách hàng đăng nhập vào website hoặc liên hệ CSKH "
            + "3. Khi khách hàng cần hỗ trợ đặc biệt: "
            + "   - Thành thật nói rằng bạn không thể xử lý yêu cầu đó "
            + "   - Hướng dẫn khách hàng liên hệ CSKH qua hotline hoặc email "
            + "   - Luôn thể hiện sự sẵn sàng hỗ trợ trong khả năng của mình "
            + "\n\nNGUYÊN TẮC TRẢ LỜI (QUAN TRỌNG - TUYỆT ĐỐI PHẢI TUÂN THỦ): "
            + "1. Trả lời ngắn gọn, rõ ràng, dễ hiểu, không dài dòng. "
            + "2. Sử dụng ngôn ngữ thân thiện, gần gũi nhưng vẫn chuyên nghiệp. "
            + "3. Khi khách hàng hỏi về sản phẩm (QUAN TRỌNG - TUYỆT ĐỐI PHẢI TUÂN THỦ): "
            + "   - CHỈ sử dụng thông tin sản phẩm được cung cấp TRONG CONTEXT "
            + "   - TUYỆT ĐỐI KHÔNG tự nghĩ ra, thêm bớt, hoặc tạo ra thông tin không có trong context "
            + "   - TUYỆT ĐỐI KHÔNG gợi ý sản phẩm KHÔNG CÓ trong context/DB "
            + "   - Khi khách hỏi về sản phẩm: CHỈ liệt kê TÊN sản phẩm (không cần giá, tồn kho, mô tả) "
            + "   - Nếu có ít sản phẩm (<20): liệt kê tất cả tên sản phẩm "
            + "   - Nếu có nhiều sản phẩm (>20): đề xuất lọc theo đặc trưng (thương hiệu, giá, loại da, kết cấu) "
            + "   - Khi khách CHỌN hoặc muốn xem chi tiết sản phẩm cụ thể: đưa link [LINK:/product/{id}] với ID từ context "
            + "   - Nếu context KHÔNG có thông tin về thành phần, công dụng, mô tả chi tiết: "
            + "     thì PHẢI nói: \"Xin lỗi, tôi không có thông tin chi tiết về [thông tin thiếu]. Bạn vui lòng click vào link sản phẩm để xem chi tiết hoặc liên hệ CSKH để được tư vấn thêm ạ.\" "
            + "4. Khi không có thông tin trong context: "
            + "   - THÀNH THẬT nói rằng không có thông tin "
            + "   - KHÔNG được tự nghĩ ra hoặc đoán mò "
            + "   - Hướng dẫn khách hàng liên hệ CSKH một cách lịch sự "
            + "5. Luôn đề xuất các giải pháp cụ thể và hữu ích. "
            + "6. Khi hướng dẫn liên hệ CSKH, luôn đề xuất các kênh liên hệ cụ thể (hotline, email, website). "
            + "\n\nQUY TẮC VÀNG: "
            + "- Nếu thông tin KHÔNG có trong context → Nói \"Không có thông tin\" "
            + "- Nếu thông tin CÓ trong context → Chỉ trả lời đúng những gì có trong context "
            + "- TUYỆT ĐỐI KHÔNG tự tạo ra thông tin mới "
            + "\n\nQUY TẮC FORMATTING BẮT BUỘC (TUYỆT ĐỐI PHẢI TUÂN THỦ): "
            + "1. TUYỆT ĐỐI KHÔNG sử dụng bất kỳ ký tự markdown nào: KHÔNG dùng **, ***, *, #, __, ~~, [], (), hoặc bất kỳ ký tự markdown nào khác. "
            + "2. Chỉ sử dụng text thuần túy, không có formatting đặc biệt. "
            + "3. Khi liệt kê các mục: "
            + "   - Sử dụng số thứ tự (1., 2., 3.) hoặc dấu gạch đầu dòng (-) "
            + "   - Mỗi mục xuống dòng riêng "
            + "   - KHÔNG dùng ký tự * hoặc ** để làm bullet points "
            + "4. Khi hiển thị thông tin sản phẩm (QUAN TRỌNG): "
            + "   - Khi khách hàng hỏi về sản phẩm: CHỈ liệt kê TÊN sản phẩm (không cần giá, tồn kho, mô tả) "
            + "   - Format khi liệt kê sản phẩm:\n"
            + "Chào bạn! Nova Beauty có các sản phẩm [loại] sau:\n"
            + "\n"
            + "1. Tên sản phẩm 1\n"
            + "2. Tên sản phẩm 2\n"
            + "3. Tên sản phẩm 3\n"
            + "\n"
            + "Bạn muốn xem chi tiết sản phẩm nào ạ? "
            + "   - Khi khách hàng CHỌN hoặc muốn xem chi tiết sản phẩm cụ thể: đưa link [LINK:/product/{id}] "
            + "   - Format khi đưa link:\n"
            + "Bạn có thể xem chi tiết sản phẩm [Tên sản phẩm] tại: [LINK:/product/{id}]\n"
            + "   - Khi có NHIỀU sản phẩm (>20): đề xuất lọc theo đặc trưng "
            + "   - Format khi đề xuất lọc:\n"
            + "Nova Beauty có rất nhiều sản phẩm [loại]. Bạn có thể lọc theo:\n"
            + "- Thương hiệu: [liệt kê các thương hiệu có trong context]\n"
            + "- Khoảng giá: [liệt kê các khoảng giá có trong context]\n"
            + "- Loại da: [liệt kê các loại da có trong context]\n"
            + "- Kết cấu: [liệt kê các kết cấu có trong context]\n"
            + "Bạn muốn lọc theo tiêu chí nào ạ? "
            + "5. Khi hướng dẫn các bước: "
            + "   - Sử dụng số thứ tự (1., 2., 3.) "
            + "   - Mỗi bước xuống dòng riêng "
            + "   - Mô tả rõ ràng từng bước "
            + "6. Khi nhấn mạnh thông tin: "
            + "   - KHÔNG dùng bold (**text**), italic (*text*), hoặc underline "
            + "   - Chỉ cần viết rõ ràng bằng text thuần túy "
            + "   - Có thể sử dụng chữ in hoa cho các từ khóa quan trọng nếu cần "
            + "7. Khi trích dẫn hoặc ví dụ: "
            + "   - Sử dụng dấu ngoặc kép \"\" để trích dẫn "
            + "   - Không dùng markdown code blocks hoặc backticks "
            + "\n\nVÍ DỤ FORMAT ĐÚNG (khi khách hỏi về sản phẩm): "
            + "Câu hỏi: Bạn có những sản phẩm son nào? "
            + "Trả lời đúng format (chỉ liệt kê tên sản phẩm):\n"
            + "Chào bạn! Nova Beauty có các sản phẩm son sau:\n"
            + "\n"
            + "1. Son Dior\n"
            + "2. Son dưỡng Dior\n"
            + "3. Son môi MAC\n"
            + "4. Son Chanel\n"
            + "\n"
            + "Bạn muốn xem chi tiết sản phẩm nào ạ? "
            + "\n\nVÍ DỤ FORMAT ĐÚNG (khi khách chọn sản phẩm): "
            + "Câu hỏi: Tôi muốn xem Son Dior hoặc Tôi chọn số 1 "
            + "Trả lời đúng format:\n"
            + "Bạn có thể xem chi tiết sản phẩm Son Dior tại: [LINK:/product/abc123]\n"
            + "\n\nVÍ DỤ FORMAT ĐÚNG (khi có nhiều sản phẩm >20): "
            + "Câu hỏi: Bạn có những sản phẩm son nào? "
            + "Trả lời đúng format:\n"
            + "Chào bạn! Nova Beauty có rất nhiều sản phẩm son. Bạn có thể lọc theo:\n"
            + "- Thương hiệu: Dior, MAC, Chanel, YSL\n"
            + "- Khoảng giá: Dưới 500.000 VNĐ, 500.000 - 1.000.000 VNĐ, Trên 1.000.000 VNĐ\n"
            + "- Loại da: Da khô, Da dầu, Da hỗn hợp, Mọi loại da\n"
            + "- Kết cấu: Matte, Glossy, Creamy\n"
            + "\n"
            + "Bạn muốn lọc theo tiêu chí nào ạ? "
            + "\n\nVÍ DỤ FORMAT SAI (KHÔNG ĐƯỢC LÀM): "
            + "**Son Dior** Giá: 453.600 VNĐ *Tồn kho: 46 sản phẩm* "
            + "\n\nLƯU Ý QUAN TRỌNG VỀ SẢN PHẨM: "
            + "- TUYỆT ĐỐI CHỈ gợi ý sản phẩm CÓ TRONG CONTEXT "
            + "- KHÔNG được tự nghĩ ra hoặc gợi ý sản phẩm ngoài DB "
            + "- Nếu context không có sản phẩm phù hợp, phải nói rõ không có "
            + "\n\nLƯU Ý CUỐI CÙNG: "
            + "Nếu bạn vi phạm bất kỳ quy tắc formatting nào ở trên, response sẽ không được chấp nhận. "
            + "Hãy luôn kiểm tra lại response của bạn trước khi trả lời để đảm bảo không có ký tự markdown nào.";

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
     * Chỉ trả về danh sách sản phẩm (tên sản phẩm), không ưu tiên danh mục con
     */
    private String getProductsContextForMessage(String userMessage) {
        // Extract keywords từ user message
        String[] productKeywords = extractProductKeywords(userMessage);
        
        // Nếu có keyword cụ thể, trả về sản phẩm
        if (productKeywords.length > 0) {
            log.debug("Returning products for keywords: {}", String.join(", ", productKeywords));
            return getFilteredProductsContext(productKeywords);
        }
        
        // Nếu không có keyword cụ thể, KHÔNG trả về toàn bộ danh sách sản phẩm
        // Chỉ trả về empty string để chatbot tự trả lời mà không cần context sản phẩm
        return "";
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
     * Lấy context về danh mục con để chatbot hỏi lại khách hàng
     */
    @Transactional(readOnly = true)
    private String getSubCategoriesContext(String keyword) {
        try {
            // Tìm category chính theo keyword
            java.util.List<com.nova_beauty.backend.dto.response.CategoryResponse> categories = categoryService.getAllCategories();
            
            // Tìm category có tên chứa keyword hoặc keyword chứa trong tên category
            // Ưu tiên exact match, sau đó là contains
            com.nova_beauty.backend.dto.response.CategoryResponse mainCategory = null;
            String lowerKeyword = keyword.toLowerCase();
            
            // Ưu tiên 1: Exact match (không phân biệt hoa thường)
            for (com.nova_beauty.backend.dto.response.CategoryResponse cat : categories) {
                if (cat.getName() != null && cat.getName().toLowerCase().equals(lowerKeyword)) {
                    mainCategory = cat;
                    break;
                }
            }
            
            // Ưu tiên 2: Category name contains keyword
            if (mainCategory == null) {
                for (com.nova_beauty.backend.dto.response.CategoryResponse cat : categories) {
                    if (cat.getName() != null && cat.getName().toLowerCase().contains(lowerKeyword)) {
                        mainCategory = cat;
                        break;
                    }
                }
            }
            
            // Ưu tiên 3: Keyword contains category name (ví dụ: "son môi" chứa "son")
            if (mainCategory == null) {
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
            
            // Format context về danh mục con
            StringBuilder context = new StringBuilder();
            context.append("DANH MỤC CON CỦA ").append(mainCategory.getName().toUpperCase()).append(":\n\n");
            
            for (int i = 0; i < subCategories.size(); i++) {
                com.nova_beauty.backend.dto.response.CategoryResponse subCat = subCategories.get(i);
                context.append(String.format("%d. %s", i + 1, subCat.getName()));
                if (subCat.getProductCount() != null && subCat.getProductCount() > 0) {
                    context.append(String.format(" (%d sản phẩm)", subCat.getProductCount()));
                }
                context.append("\n");
            }
            
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

