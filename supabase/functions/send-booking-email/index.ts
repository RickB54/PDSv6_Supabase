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

    const { 
      to, 
      bcc,
      subject, 
      html, 
      customerName, 
      customerEmail, 
      phone = '', 
      address = '', 
      service, 
      date, 
      time, 
      price, 
      status = 'TENTATIVE', 
      notes = '',
      vehicleYear = '',
      vehicleMake = '',
      vehicleModel = '',
      vehicleType = ''
    } = await req.json()

    console.log(`📧 Sending email to: ${to}, Subject: ${subject}`);

    const isConfirmed = status.toUpperCase() === 'CONFIRMED' || status.toUpperCase() === 'DONE';
    const headerTitle = isConfirmed ? 'Booking Confirmed!' : 'Booking Request Received';
    const statusLabel = status.toUpperCase();
    const statusBg = isConfirmed ? '#10b981' : '#fef3c7';
    const statusText = isConfirmed ? '#ffffff' : '#92400e';

    const vehicleInfo = `${vehicleYear} ${vehicleMake} ${vehicleModel} (${vehicleType})`.trim();

    const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'Prime Auto Detail <onboarding@resend.dev>'

    // Send email using Resend
    const payload = {
      from: SENDER_EMAIL,
      to: Array.isArray(to) ? to : [to],
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      reply_to: customerEmail || undefined, // Allow replying to the customer
      subject: subject,
      html: html || `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 20px; border-radius: 12px 12px 0 0; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">🚗 ${headerTitle}</h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Professional Detailing Solutions</p>
          </div>
          
          <div style="background-color: white; padding: 35px; border-radius: 0 0 12px 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
            <div style="margin-bottom: 30px; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px;">
              <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; margin-bottom: 15px;">Customer Profile</h2>
              <p style="font-size: 20px; color: #111827; margin: 0; font-weight: 700;">${customerName}</p>
              ${customerEmail ? `<p style="font-size: 15px; color: #4b5563; margin: 5px 0;">📧 ${customerEmail}</p>` : ''}
              ${phone ? `<p style="font-size: 15px; color: #4b5563; margin: 5px 0;">📞 ${phone}</p>` : ''}
              ${address ? `<p style="font-size: 15px; color: #4b5563; margin: 5px 0;">📍 ${address}</p>` : ''}
            </div>

            <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 30px;">
              <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-top: 0; margin-bottom: 15px;">Appointment Details</h2>
              <p style="margin: 12px 0; color: #334155; font-size: 16px;"><strong>📅 Date:</strong> ${date}</p>
              <p style="margin: 12px 0; color: #334155; font-size: 16px;"><strong>⏰ Time:</strong> ${time}</p>
              <p style="margin: 12px 0; color: #334155; font-size: 16px;"><strong>🔧 Service:</strong> ${service}</p>
              ${vehicleInfo ? `<p style="margin: 12px 0; color: #334155; font-size: 16px;"><strong>🚙 Vehicle:</strong> ${vehicleInfo}</p>` : ''}
              
              <div style="margin-top: 20px; padding-top: 15px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b; font-weight: 600;">ESTIMATED TOTAL:</span>
                <span style="color: #10b981; font-size: 24px; font-weight: 800;">$${price}</span>
              </div>
            </div>

            ${notes ? `
            <div style="margin-bottom: 30px; padding: 20px; background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
              <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Special Instructions</h3>
              <p style="margin: 0; color: #b45309; font-size: 15px; line-height: 1.6;">${notes}</p>
            </div>
            ` : ''}
            
            <div style="display: flex; align-items: center; gap: 10px; margin-top: 30px;">
              <span style="color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;">Status:</span>
              <span style="background-color: ${statusBg}; color: ${statusText}; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 800; letter-spacing: 0.05em; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">${statusLabel}</span>
            </div>
            
            ${!isConfirmed ? `
            <div style="margin-top: 35px; padding: 20px; background: #e0f2fe; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; color: #0369a1; font-size: 14px; line-height: 1.6;">
                <strong>Admin Action Required:</strong> Log in to your dashboard to review this request and confirm the appointment.
              </p>
            </div>
            ` : `
            <p style="color: #6b7280; font-size: 14px; margin-top: 25px; text-align: center; font-style: italic;">
              This booking is officially scheduled in the system.
            </p>
            `}
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 11px;">
            <p style="margin-bottom: 5px; font-weight: 600;">PRIME AUTO DETAIL</p>
            <p style="margin: 0;">Professional Detailing Solutions & Ceramic Protection</p>
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
  } catch (error: any) {
    console.error('❌ Edge Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})

