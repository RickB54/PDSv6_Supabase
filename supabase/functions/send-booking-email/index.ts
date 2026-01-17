import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📧 Edge Function: Received email request');

    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not set!');
      throw new Error('RESEND_API_KEY environment variable not set');
    }

    const { to, subject, html, customerName, customerEmail, service, date, time, price } = await req.json()

    console.log(`📧 Sending email to: ${to}, Subject: ${subject}`);

    // Send email using Resend
    const payload = {
      from: 'onboarding@resend.dev', // Plain email for testing mode
      to: [to],
      reply_to: customerEmail || undefined, // Allow replying to the customer
      subject: subject,
      html: html || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚗 New Booking Confirmed!</h1>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">
              <strong>Customer:</strong> ${customerName}
            </p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 10px 0; color: #1f2937;"><strong>📅 Date:</strong> ${date}</p>
              <p style="margin: 10px 0; color: #1f2937;"><strong>⏰ Time:</strong> ${time}</p>
              <p style="margin: 10px 0; color: #1f2937;"><strong>🔧 Service:</strong> ${service}</p>
              <p style="margin: 10px 0; color: #10b981; font-size: 20px;"><strong>💰 Total:</strong> $${price}</p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              Status: <span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 4px; font-weight: bold;">TENTATIVE</span>
            </p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
              Log in to your admin dashboard to confirm or manage this booking.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>Prime Auto Detail - Professional Detailing Services</p>
          </div>
        </div>
      `,
    };

    console.log('📧 Payload:', JSON.stringify(payload, null, 2));

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    console.log(`📧 Resend API Response Status: ${res.status}`);
    console.log(`📧 Resend API Response Data:`, JSON.stringify(data, null, 2));

    if (!res.ok) {
      console.error('❌ Resend API Error:', data);
      throw new Error(JSON.stringify(data));
    }

    console.log('✅ Email sent successfully!', data.id);

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('❌ Edge Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

