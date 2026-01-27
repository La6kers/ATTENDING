@echo off
setlocal enabledelayedexpansion

echo.
echo ======================================================================
echo      ATTENDING AI - Build Verification
echo ======================================================================
echo.

cd /d "C:\Users\la6ke\Projects\ATTENDING"

echo [1/5] Current Git Status
echo ======================================================================
git branch --show-current
git log --oneline -1
echo.

echo [2/5] Running TypeScript Compilation Check
echo ======================================================================
echo Checking Provider Portal...
call npx tsc --noEmit --project apps/provider-portal/tsconfig.json 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Provider portal has TypeScript issues
) else (
    echo [OK] Provider portal TypeScript: PASSED
)

echo.
echo Checking Patient Portal...
call npx tsc --noEmit --project apps/patient-portal/tsconfig.json 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Patient portal has TypeScript issues
) else (
    echo [OK] Patient portal TypeScript: PASSED
)
echo.

echo [3/5] Running Full Build
echo ======================================================================
call npm run build 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [FAILED] Build failed - see errors above
    echo.
    pause
    exit /b 1
) else (
    echo.
    echo [OK] Build completed successfully!
)
echo.

echo [4/5] Running Tests
echo ======================================================================
call npm run test 2>&1
echo.

echo [5/5] Build Verification Summary
echo ======================================================================
echo.
echo Build verification complete!
echo.
echo Next steps:
echo   1. If build passed: Run cleanup-orphans.ps1 -Execute
echo   2. Commit changes: git add -A ^&^& git commit -m "chore: cleanup"
echo   3. Push: git push origin mockup-2
echo.
pause
