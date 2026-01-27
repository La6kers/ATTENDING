@echo off
echo ============================================
echo ATTENDING AI - Development Setup Script
echo ============================================
echo.

echo Step 1: Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo Step 2: Generating Prisma client...
cd prisma
call npx prisma generate
if errorlevel 1 (
    echo WARNING: Prisma generate had issues, continuing...
)

echo.
echo Step 3: Creating database and running migrations...
call npx prisma db push --force-reset
if errorlevel 1 (
    echo WARNING: Database push had issues, trying migrate...
    call npx prisma migrate dev --name init
)

echo.
echo Step 4: Seeding the database with sample data...
call npx prisma db seed
if errorlevel 1 (
    echo WARNING: Database seed had issues, continuing...
)

cd ..

echo.
echo ============================================
echo Setup complete! 
echo.
echo To start the application:
echo   npm run dev
echo.
echo Login credentials (development):
echo   Provider: provider@attending.dev / password
echo   Admin:    admin@attending.dev / password
echo   Nurse:    nurse@attending.dev / password
echo ============================================
pause
