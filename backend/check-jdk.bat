@echo off
echo === JDK Version Check ===

REM Kiểm tra Java version
for /f "tokens=3" %%g in ('java -version 2^>^&1 ^| findstr /i "version"') do (
    set JAVA_VERSION=%%g
    set JAVA_VERSION=!JAVA_VERSION:"=!
    set JAVA_VERSION=!JAVA_VERSION:.= !
    for /f "tokens=1" %%h in ("!JAVA_VERSION!") do set JAVA_VERSION=%%h
)

echo Current Java version: %JAVA_VERSION%

if %JAVA_VERSION% geq 17 (
    echo ✅ Java version is compatible (17 or higher)
    
    if %JAVA_VERSION% equ 17 (
        echo 📌 Using JDK 17 (Recommended)
    ) else if %JAVA_VERSION% equ 21 (
        echo 📌 Using JDK 21 (Compatible - will compile to target 17)
    ) else if %JAVA_VERSION% equ 24 (
        echo 📌 Using JDK 24 (Compatible - will compile to target 17)
    ) else (
        echo 📌 Using JDK %JAVA_VERSION% (Compatible - will compile to target 17)
    )
    
    echo.
    echo 🚀 You can run the application with:
    echo    mvn spring-boot:run
    
) else (
    echo ❌ Java version is not compatible
    echo    Required: JDK 17 or higher
    echo    Current: JDK %JAVA_VERSION%
    echo.
    echo Please install JDK 17 or higher
)

echo.
echo === Maven Check ===
mvn -version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=3" %%g in ('mvn -version ^| findstr /i "Apache Maven"') do (
        echo ✅ Maven version: %%g
    )
) else (
    echo ❌ Maven not found. Please install Maven 3.6+
)

pause
