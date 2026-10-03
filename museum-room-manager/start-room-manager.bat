@echo off
setlocal
cd /d "%~dp0"

if not exist node_modules (
  echo Installing Museum Room Manager dependencies...
  call npm install
  if errorlevel 1 goto :fail
)

echo.
echo Starting Museum Room Manager...
echo Open http://127.0.0.1:4217 in your browser if it does not open automatically.
echo.
start "" http://127.0.0.1:4217
call npm start
goto :end

:fail
echo.
echo Museum Room Manager setup failed. Review the message above.
pause

:end
endlocal
