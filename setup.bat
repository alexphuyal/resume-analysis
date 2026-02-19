@echo off
echo ====================================================
echo    ResumeAI - First Time Setup
echo ====================================================

:: Install root dependencies
echo Installing root dependencies (Turborepo)...
cd /d "%~dp0"
npm install

:: Install web dependencies
echo Installing React frontend dependencies...
cd /d "%~dp0apps\web"
npm install

:: Install API dependencies + Prisma
echo Installing Node.js API dependencies...
cd /d "%~dp0apps\api"
npm install

:: Generate Prisma client
echo Generating Prisma client...
npx prisma generate

:: Run DB migration
echo Running database migrations...
npx prisma migrate dev --name init

:: Python dependencies
echo Installing Python dependencies for AI service...
cd /d "%~dp0apps\ai-service"
pip install -r requirements.txt

echo.
echo ====================================================
echo  Setup complete! Run start-all.bat to launch.
echo ====================================================
pause
