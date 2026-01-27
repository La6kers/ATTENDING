@echo off
setlocal enabledelayedexpansion

echo.
echo ======================================================================
echo      ATTENDING AI - Patient Portal ESLint Quick Fix
echo ======================================================================
echo.

cd /d "C:\Users\la6ke\Projects\ATTENDING"

echo Running patient-portal build...
echo ======================================================================
cd apps\patient-portal
call npm run build 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [INFO] Build has errors - check output above
) else (
    echo.
    echo [OK] Patient Portal build completed!
)
cd ..\..

echo.
echo ======================================================================
echo Build check complete!
echo ======================================================================
pause
