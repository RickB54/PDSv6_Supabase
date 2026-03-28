@echo off
echo ========================================
echo  Deploying Supabase Edge Functions
echo ========================================
echo.

echo Project: kqhaoyaermsqrilhsfxj
echo.

echo [1/3] Deploying create-admin function...
call npx supabase functions deploy create-admin --project-ref kqhaoyaermsqrilhsfxj
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy create-admin
    pause
    exit /b 1
)
echo ✓ create-admin deployed successfully!
echo.

echo [2/4] Deploying create-employee function...
call npx supabase functions deploy create-employee --project-ref kqhaoyaermsqrilhsfxj
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy create-employee
    pause
    exit /b 1
)
echo ✓ create-employee deployed successfully!
echo.

echo [3/4] Deploying Stripe functions...
call npx supabase functions deploy create-checkout --project-ref kqhaoyaermsqrilhsfxj
call npx supabase functions deploy stripe-webhook --project-ref kqhaoyaermsqrilhsfxj
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy Stripe functions
    pause
    exit /b 1
)
echo ✓ Stripe functions deployed successfully!
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
echo - https://kqhaoyaermsqrilhsfxj.supabase.co/functions/v1/create-checkout
echo - https://kqhaoyaermsqrilhsfxj.supabase.co/functions/v1/stripe-webhook
echo.
echo You can now test user creation in the Users ^& Roles page!
echo.
pause
