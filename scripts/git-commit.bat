@echo off
REM ============================================================
REM ATTENDING AI - Git Commit Script
REM Created: January 12, 2026
REM ============================================================

echo.
echo ====================================================
echo  ATTENDING AI - Git Commit Utility
echo ====================================================
echo.

cd /d "C:\Users\Scott\source\repos\La6kers\ATTENDING"

REM Check if git is available
where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Git is not installed or not in PATH
    pause
    exit /b 1
)

REM Check git status
echo [1/5] Checking repository status...
echo.
git status --short

echo.
echo ====================================================
echo.

REM Prompt for confirmation
set /p CONFIRM=Do you want to stage all changes? (y/n): 
if /i not "%CONFIRM%"=="y" (
    echo Operation cancelled.
    pause
    exit /b 0
)

REM Stage all changes
echo.
echo [2/5] Staging all changes...
git add -A

echo.
echo [3/5] Staged files:
git diff --cached --name-status

REM Get commit message
echo.
echo ====================================================
set /p COMMIT_MSG=Enter commit message (or press Enter for default): 

if "%COMMIT_MSG%"=="" (
    set COMMIT_MSG=feat: ATTENDING AI platform - comprehensive application update
)

REM Commit
echo.
echo [4/5] Committing with message: "%COMMIT_MSG%"
git commit -m "%COMMIT_MSG%"

if %ERRORLEVEL% neq 0 (
    echo.
    echo WARNING: Commit may have failed or nothing to commit
    echo.
)

REM Show result
echo.
echo [5/5] Latest commits:
git log --oneline -5

echo.
echo ====================================================
echo  Commit process complete!
echo ====================================================
echo.
echo To push to remote, run: git push origin main
echo.
pause
