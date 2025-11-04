#!/bin/bash

echo "=== JDK Version Check ==="

# Kiểm tra Java version
JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)

echo "Current Java version: $JAVA_VERSION"

if [ "$JAVA_VERSION" -ge 17 ]; then
    echo "✅ Java version is compatible (17 or higher)"
    
    if [ "$JAVA_VERSION" -eq 17 ]; then
        echo "📌 Using JDK 17 (Recommended)"
    elif [ "$JAVA_VERSION" -eq 21 ]; then
        echo "📌 Using JDK 21 (Compatible - will compile to target 17)"
    elif [ "$JAVA_VERSION" -eq 24 ]; then
        echo "📌 Using JDK 24 (Compatible - will compile to target 17)"
    else
        echo "📌 Using JDK $JAVA_VERSION (Compatible - will compile to target 17)"
    fi
    
    echo ""
    echo "🚀 You can run the application with:"
    echo "   mvn spring-boot:run"
    
else
    echo "❌ Java version is not compatible"
    echo "   Required: JDK 17 or higher"
    echo "   Current: JDK $JAVA_VERSION"
    echo ""
    echo "Please install JDK 17 or higher"
fi

echo ""
echo "=== Maven Check ==="
if command -v mvn &> /dev/null; then
    MVN_VERSION=$(mvn -version | head -n 1 | cut -d' ' -f3)
    echo "✅ Maven version: $MVN_VERSION"
else
    echo "❌ Maven not found. Please install Maven 3.6+"
fi
