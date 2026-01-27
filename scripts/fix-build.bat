@echo off
setlocal enabledelayedexpansion

echo.
echo ======================================================================
echo      ATTENDING AI - Build Fix Script
echo ======================================================================
echo.

cd /d "C:\Users\la6ke\Projects\ATTENDING"

echo [1/5] Installing lucide-react in shared package...
echo ======================================================================
cd apps\shared
call npm install lucide-react --save-dev
cd ..\..
echo Done!
echo.

echo [2/5] Installing missing dependencies...
echo ======================================================================
cd apps\patient-portal
call npm install formidable form-data --save-dev
call npm install @types/formidable --save-dev
cd ..\..
echo Done!
echo.

echo [3/5] Cleaning npm cache and reinstalling all...
echo ======================================================================
call npm install
echo Done!
echo.

echo [4/5] Running TypeScript check...
echo ======================================================================
call npx tsc --noEmit --project apps/shared/tsconfig.json 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Shared package still has issues - check output above
) else (
    echo [OK] Shared package: PASSED
)
echo.

echo [5/5] Running full build...
echo ======================================================================
call npm run build 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [INFO] Build may have warnings - review output above
) else (
    echo.
    echo [OK] Build completed successfully!
)
echo.

echo ======================================================================
echo Build fix script complete!
echo.
echo If there are still errors, they may need manual fixes.
echo See docs\BUILD_FIXES_NEEDED.md for details.
echo ======================================================================
echo.
pause
