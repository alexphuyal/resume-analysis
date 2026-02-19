@echo off
echo ====================================================
echo    ResumeAI - Starting All Services
echo ====================================================

:: Start FastAPI AI Service
echo [1/3] Starting FastAPI AI Service (port 8000)...
start "AI Service" cmd /k "cd /d "%~dp0apps\ai-service" && pip install -r requirements.txt -q && python main.py"

timeout /t 3 /nobreak >nul

:: Start Node.js API
echo [2/3] Starting Node.js API (port 5000)...
start "Node API" cmd /k "cd /d "%~dp0apps\api" && npm install && npx prisma generate && npx prisma migrate dev --name init && npm run dev"

timeout /t 3 /nobreak >nul

:: Start React Frontend
echo [3/3] Starting React Frontend (port 3000)...
start "Web Frontend" cmd /k "cd /d "%~dp0apps\web" && npm install && npm run dev"

echo.
echo ====================================================
echo  Services starting:
echo   Frontend  → http://localhost:3000
echo   API       → http://localhost:5000
echo   AI        → http://localhost:8000
echo   API Docs  → http://localhost:8000/docs
echo ====================================================
echo.
pause
