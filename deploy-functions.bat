@echo off
echo ========================================
echo  Deploying Supabase Edge Functions
echo ========================================
echo.

echo Project: kqhaoyaermsqrilhsfxj
echo.

echo [1/3] Deploying create-admin function...
call supabase functions deploy create-admin --project-ref kqhaoyaermsqrilhsfxj
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy create-admin
    pause
    exit /b 1
)
echo ✓ create-admin deployed successfully!
echo.

echo [2/3] Deploying create-employee function...
call supabase functions deploy create-employee --project-ref kqhaoyaermsqrilhsfxj
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy create-employee
    pause
    exit /b 1
)
echo ✓ create-employee deployed successfully!
echo.

echo [3/3] Verifying deployment...
echo.
echo ========================================
echo  ✓ All Edge Functions Deployed!
echo ========================================
echo.
echo Functions available at:
echo - https://kqhaoyaermsqrilhsfxj.supabase.co/functions/v1/create-admin
echo - https://kqhaoyaermsqrilhsfxj.supabase.co/functions/v1/create-employee
echo.
echo You can now test user creation in the Users ^& Roles page!
echo.
pause
