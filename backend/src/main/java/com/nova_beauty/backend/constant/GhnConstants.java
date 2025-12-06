package com.nova_beauty.backend.constant;

public final class GhnConstants {
    private GhnConstants() {}

    // Default shop info (có thể chỉnh lại cho NovaBeauty nếu cần)
    public static final String DEFAULT_FROM_NAME = "NovaBeauty";
    public static final String DEFAULT_FROM_PHONE = "0973730527";
    public static final String DEFAULT_FROM_ADDRESS = "136 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội, Vietnam";
    public static final String DEFAULT_FROM_WARD_CODE = "1A0602";
    public static final Integer DEFAULT_FROM_DISTRICT_ID = 1485;
    public static final Integer DEFAULT_FROM_PROVINCE_ID = 201;

    // Service type
    public static final int SERVICE_TYPE_LIGHT = 2; // < 20kg
    public static final int SERVICE_TYPE_HEAVY = 5; // >= 20kg

    // Weight threshold
    public static final int HEAVY_SERVICE_WEIGHT_THRESHOLD = 20000; // 20kg in grams

    // Default dimensions and weight
    public static final int DEFAULT_DIMENSION = 12; // cm
    public static final int DEFAULT_WEIGHT = 1200; // grams

    // Other constants
    public static final String REQUIRED_NOTE = "CHOTHUHANG";
    public static final String CONTENT = "Sản phẩm từ NovaBeauty";
}


