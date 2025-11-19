package com.nova_beauty.backend.configuration;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// Chá»‰ cho Spring biáº¿t, náº¿u ngÆ°á»i dÃ¹ng gÃµ url báº¯t Ä‘áº§u báº±ng:
/*
    /promotion_media/â€¦ â†’ hÃ£y vÃ o thÆ° má»¥c uploads/promotions/ trÃªn mÃ¡y, tÃ¬m file vÃ  tráº£ vá» Ä‘Ãºng file tÆ°Æ¡ng á»©ng.
    /voucher_media/... â†’ thÆ° má»¥c uploads/vouchers/
    /product_media/... â†’ thÆ° má»¥c uploads/product_media/
    /promotion_media/... â†’ thÆ° má»¥c uploads/promotions/
    /vouchers/** â†’ thÆ° má»¥c uploads/vouchers/
    /promotions/** â†’ thÆ° má»¥c uploads/promotions/
*/
@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Khi client request Ä‘áº¿n /product_media/**, Spring sáº½ serve file tá»« thÆ° má»¥c product_media/ trong project.
        registry.addResourceHandler("/product_media/**")
                .addResourceLocations("file:uploads/product_media/");

        // Khi client request Ä‘áº¿n /profile_media/**, serve file avatar ngÆ°á»i dÃ¹ng.
        registry.addResourceHandler("/profile_media/**")
                .addResourceLocations("file:uploads/profile_media/");

        // Khi client request Ä‘áº¿n /voucher_media/**, Spring sáº½ serve file tá»« thÆ° má»¥c vouchers/ trong project.
        registry.addResourceHandler("/voucher_media/**")
                .addResourceLocations("file:uploads/vouchers/");

        // Khi client request Ä‘áº¿n /promotion_media/**, Spring sáº½ serve file tá»« thÆ° má»¥c promotions/ trong project.
        registry.addResourceHandler("/promotion_media/**")
                .addResourceLocations("file:uploads/promotions/");

        // Khi client request Ä‘áº¿n /vouchers/** vÃ  /promotions/**, Spring sáº½ serve file tá»« thÆ° má»¥c vouchers/ vÃ  promotions/ trong project.
        registry.addResourceHandler("/vouchers/**")
                .addResourceLocations("file:uploads/vouchers/");

        registry.addResourceHandler("/promotions/**")
                .addResourceLocations("file:uploads/promotions/");

        // Handle trÆ°á»ng há»£p request trá»±c tiáº¿p Ä‘áº¿n filename (UUID pattern) - tÃ¬m trong táº¥t cáº£ cÃ¡c thÆ° má»¥c media
        // Pattern: UUID vá»›i extension (vÃ­ dá»¥: 17e72808-42a6-47fb-84cf-c00ee4e8308a.png)
        // ThÃªm handler cho tá»«ng extension phá»• biáº¿n
        String[] extensions = { "png", "jpg", "jpeg", "gif", "webp", "mp4" };
        for (String ext : extensions) {
            registry.addResourceHandler("/*." + ext)
                    .addResourceLocations(
                            "file:uploads/promotions/",
                            "file:uploads/vouchers/",
                            "file:uploads/product_media/",
                            "file:uploads/profile_media/"
                    );
        }
    }
}




