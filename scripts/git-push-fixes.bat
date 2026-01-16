@echo off
REM ATTENDING AI - Git Commit and Push Script
REM Run this from the project root: C:\Users\la6ke\Projects\ATTENDING

echo ========================================
echo ATTENDING AI - Committing Changes
echo ========================================
echo.

cd /d C:\Users\la6ke\Projects\ATTENDING

echo [1/4] Checking git status...
git status --short
echo.

echo [2/4] Staging all changes...
git add -A
echo Done.
echo.

echo [3/4] Committing changes...
git commit -m "fix: resolve build-blocking type errors and streamline architecture" -m "- Fix AIImagingRecommendation type export in imagingOrderingStore.ts" -m "- Make ui-primitives package self-contained (fix GradientHeader import)" -m "- Fix clinical-types package exports for RECOMMENDATION_CATEGORY_CONFIGS" -m "- Add cleanup-eslint-warnings.ps1 automation script" -m "- Resolves 3 critical build errors blocking npm run build"
echo.

echo [4/4] Pushing to origin...
git push origin main
echo.

echo ========================================
echo Done! Changes pushed to GitHub.
echo ========================================
echo.
echo View at: https://github.com/La6kers/ATTENDING
pause
