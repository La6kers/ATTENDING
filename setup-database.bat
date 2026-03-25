@echo off
REM ============================================================
REM ATTENDING AI - Quick Setup Script
REM Run this from the project root: C:\Users\Scott\source\repos\La6kers\ATTENDING
REM ============================================================

echo.
echo ========================================
echo   ATTENDING AI - Database Setup
echo ========================================
echo.

REM Step 1: Verify we're in the right directory
if not exist "prisma\schema.prisma" (
    echo ERROR: prisma\schema.prisma not found!
    echo Please run this script from the project root directory.
    exit /b 1
)

echo [1/5] Installing dependencies...
call npm install

echo.
echo [2/5] Generating Prisma client...
call npx prisma generate --schema=prisma/schema.prisma

if errorlevel 1 (
    echo ERROR: Failed to generate Prisma client.
    echo Make sure you have @prisma/client installed.
    exit /b 1
)

echo.
echo [3/5] Checking PostgreSQL connection...
echo Make sure PostgreSQL is running on localhost:5432
echo Database: attending_dev
echo User: postgres
echo.
pause

echo.
echo [4/5] Pushing schema to database...
call npx prisma db push --schema=prisma/schema.prisma

if errorlevel 1 (
    echo.
    echo WARNING: Database push failed. 
    echo Please ensure PostgreSQL is running and the DATABASE_URL in .env is correct.
    echo Current DATABASE_URL should be: postgresql://postgres:postgres@localhost:5432/attending_dev
    echo.
    echo To create the database manually:
    echo   psql -U postgres -c "CREATE DATABASE attending_dev;"
    echo.
    pause
)

echo.
echo [5/5] Seeding database with sample data...
call npx tsx prisma/seed.ts

if errorlevel 1 (
    echo.
    echo WARNING: Seed failed. The database may already have data.
    echo You can run "npx prisma studio" to view the database.
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Run: npm run dev
echo   2. Provider Portal: http://localhost:3002
echo   3. Patient Portal: http://localhost:3001
echo   4. Database Studio: npx prisma studio
echo.
