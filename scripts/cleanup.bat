@echo off
REM ============================================================
REM ATTENDING AI - Cleanup Script
REM Removes legacy code, placeholder directories, and temp files
REM Created: January 12, 2026
REM ============================================================

echo.
echo ====================================================
echo  ATTENDING AI - Cleanup Utility
echo ====================================================
echo.

cd /d "C:\Users\Scott\source\repos\La6kers\ATTENDING"

echo This script will remove:
echo   - Legacy prototype files (apps/_legacy-prototypes)
echo   - Backup files (*.bak)
echo   - Empty placeholder directories
echo   - Temporary build artifacts
echo.

set /p CONFIRM=Continue with cleanup? (y/n): 
if /i not "%CONFIRM%"=="y" (
    echo Cleanup cancelled.
    pause
    exit /b 0
)

echo.
echo [1/6] Removing legacy prototypes...
if exist "apps\_legacy-prototypes" (
    rmdir /s /q "apps\_legacy-prototypes"
    echo       Removed: apps\_legacy-prototypes
) else (
    echo       Not found: apps\_legacy-prototypes
)

echo.
echo [2/6] Removing backup files...
for /r %%f in (*.bak) do (
    del /q "%%f"
    echo       Removed: %%f
)

echo.
echo [3/6] Checking for empty ai-service placeholder...
if exist "services\ai-service" (
    echo       Found: services\ai-service
    echo       Note: Review if this should be kept for future implementation
)

echo.
echo [4/6] Cleaning Next.js build caches...
for /d %%d in (apps\*) do (
    if exist "%%d\.next" (
        rmdir /s /q "%%d\.next"
        echo       Cleaned: %%d\.next
    )
)

echo.
echo [5/6] Cleaning Turbo cache...
if exist ".turbo" (
    rmdir /s /q ".turbo"
    echo       Cleaned: .turbo
)

echo.
echo [6/6] Checking for duplicate files...
if exist "apps\provider-portal\pages\treatment-plan.tsx" (
    if exist "apps\provider-portal\pages\treatment-plans.tsx" (
        echo       WARNING: Found both treatment-plan.tsx and treatment-plans.tsx
        echo                Consider consolidating these files
    )
)

echo.
echo ====================================================
echo  Cleanup Complete!
echo ====================================================
echo.
echo Recommended next steps:
echo   1. Run: npm install
echo   2. Run: npm run build
echo   3. Run: scripts\git-commit.bat
echo.
pause
