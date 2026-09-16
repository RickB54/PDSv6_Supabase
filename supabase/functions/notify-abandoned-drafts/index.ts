import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://kqhaoyaermsqrilhsfxj.supabase.co'
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ADMIN_EMAIL = 'rick.primeautodetail@gmail.com'
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'Prime Auto Detail <onboarding@resend.dev>'
const DAILY_MAX_EMAILS = 25

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://kqhaoyaermsqrilhsfxj.supabase.co'
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const ADMIN_EMAIL = 'rick.primeautodetail@gmail.com'
  const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'Prime Auto Detail <onboarding@resend.dev>'
  const DAILY_MAX_EMAILS = 25

  // 1. Security Check: Require Service Role Authorization (server-to-server only)
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || ''
  const apikeyHeader = req.headers.get('apikey') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim() || apikeyHeader.trim()

  let isAuthorized = false
  if (token) {
    if (SERVICE_ROLE_KEY && token === SERVICE_ROLE_KEY) {
      isAuthorized = true
    } else {
      try {
        const parts = token.split('.')
        if (parts.length === 3) {
          const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/')
          const payload = JSON.parse(atob(base64Url))
          if (payload.role === 'service_role' && payload.ref === 'kqhaoyaermsqrilhsfxj') {
            isAuthorized = true
          }
        }
      } catch {
        isAuthorized = false
      }
    }
  }

  if (!isAuthorized) {
    console.warn('⛔ Unauthorized attempt to invoke notify-abandoned-drafts')
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Service role key required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    )
  }

  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY environment variable not set')
    return new Response(
      JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY!)

    // 2. Daily Sanity Cap Check (max 25 emails in last 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: dailyCount, error: countErr } = await supabase
      .from('booking_drafts')
      .select('*', { count: 'exact', head: true })
      .gte('notified_at', twentyFourHoursAgo)

    if (countErr) {
      console.error('❌ Error checking daily cap:', countErr)
    }

    if (dailyCount !== null && dailyCount >= DAILY_MAX_EMAILS) {
      console.warn(`⚠️ Daily sanity cap reached: ${dailyCount}/${DAILY_MAX_EMAILS} alerts sent in past 24h.`)

      // Check if we've already sent a cap warning email in the last 24h
      const { data: capSetting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'abandoned_drafts_cap_warning')
        .maybeSingle()

      const lastWarned = capSetting?.value?.warned_at ? new Date(capSetting.value.warned_at).getTime() : 0
      const nowMs = Date.now()

      // If no warning email sent in past 24 hours, dispatch a 1-time heads-up email to admin
      if (nowMs - lastWarned > 24 * 60 * 60 * 1000) {
        console.log('📧 Sending 1-time daily cap warning email to admin...')
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: SENDER_EMAIL,
              to: [ADMIN_EMAIL],
              subject: `⚠️ Alert Limit Reached: 25 Abandoned Form Emails Sent in Past 24h`,
              html: `
                <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f8fafc;">
                  <div style="background: #eab308; padding: 25px 20px; border-radius: 12px 12px 0 0; text-align: center; color: #713f12;">
                    <div style="font-size: 12px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 4px;">System Notification</div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 800;">⚠️ Daily Alert Cap Reached (25/25)</h1>
                  </div>
                  <div style="background-color: #1e293b; padding: 25px; border-radius: 0 0 12px 12px; border: 1px solid #334155; border-top: none;">
                    <p style="font-size: 15px; line-height: 1.6; color: #e2e8f0; margin-top: 0;">
                      You have received <strong>25 abandoned booking form alerts</strong> within the last 24 hours.
                    </p>
                    <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">
                      To prevent your inbox from being flooded, individual email alerts are now paused until the rolling 24-hour count drops below 25.
                    </p>
                    <div style="background: #0f172a; padding: 15px; border-radius: 8px; border: 1px solid #334155; margin: 20px 0;">
                      <p style="margin: 0; font-size: 13px; color: #38bdf8;">
                        💡 <strong>Don't worry:</strong> Abandoned drafts are still actively captured and stored in your database. You can review all incomplete forms anytime in your CRM dashboard.
                      </p>
                    </div>
                    <div style="text-align: center; margin-top: 25px;">
                      <a href="https://primeautodetail.com/follow-up-center" style="background: #eab308; color: #713f12; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 800; font-size: 14px; display: inline-block;">
                        Open Follow-Up Center →
                      </a>
                    </div>
                  </div>
                </div>
              `,
            }),
          })

          // Save timestamp to prevent repeat warnings
          await supabase
            .from('app_settings')
            .upsert({
              key: 'abandoned_drafts_cap_warning',
              value: { warned_at: new Date().toISOString() },
              updated_at: new Date().toISOString()
            }, { onConflict: 'key' })
        } catch (warnErr) {
          console.error('❌ Failed to send cap warning email:', warnErr)
        }
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: 'daily_cap_exceeded', 
          daily_count: dailyCount, 
          cap: DAILY_MAX_EMAILS,
          warning_sent: nowMs - lastWarned > 24 * 60 * 60 * 1000
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // 3. Query unnotified drafts inactive for > 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const nowIso = new Date().toISOString()

    const { data: drafts, error: fetchErr } = await supabase
      .from('booking_drafts')
      .select('*')
      .eq('status', 'draft')
      .is('notified_at', null)
      .lt('updated_at', fifteenMinutesAgo)
      .gt('expires_at', nowIso)
      .order('updated_at', { ascending: true })
      .limit(10)

    if (fetchErr) {
      console.error('❌ Error fetching abandoned drafts:', fetchErr)
      throw fetchErr
    }

    if (!drafts || drafts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No unnotified abandoned drafts found.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`📋 Found ${drafts.length} abandoned draft(s) requiring alert notification.`)

    let sentCount = 0

    // 4. Send alert for each draft
    for (const draft of drafts) {
      const isContact = draft.source === 'contact'
      const vehicleInfo = [draft.vehicle_year, draft.vehicle_make, draft.vehicle_model, draft.vehicle_type ? `(${draft.vehicle_type})` : '']
        .filter(Boolean)
        .join(' ')
        .trim() || 'Not specified'

      const preferredDateFormatted = draft.preferred_date ? draft.preferred_date : 'Not selected'
      const customerName = draft.name || 'Unknown Visitor'
      const phoneClean = draft.phone ? draft.phone.replace(/\D/g, '') : ''
      const addOnsList = Array.isArray(draft.add_ons) && draft.add_ons.length > 0 
        ? draft.add_ons.join(', ') 
        : 'None'

      const headerGradient = isContact 
        ? 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)' 
        : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)'
      const headerTitle = isContact ? '🚨 Abandoned Contact Form' : '🚨 Abandoned Booking Form'
      const headerSubtitle = isContact
        ? "A visitor started filling out a contact / evaluation inquiry 15 minutes ago but didn't submit."
        : "A customer started filling out the booking form 15 minutes ago but didn't finish."
      const subject = isContact
        ? `🚨 Abandoned Contact Form: ${customerName} - ${draft.service_package || draft.vehicle_type || 'General Inquiry'}`
        : `🚨 Abandoned Booking: ${customerName} - ${draft.service_package || 'Incomplete Booking'}`

      const emailHtml = `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f8fafc;">
          <div style="background: ${headerGradient}; padding: 30px 20px; border-radius: 12px 12px 0 0; text-align: center; color: white;">
            <div style="font-size: 13px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 6px; opacity: 0.9;">Lead Recovery Alert</div>
            <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em;">${headerTitle}</h1>
            <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.95;">${headerSubtitle}</p>
          </div>
          
          <div style="background-color: #1e293b; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #334155; border-top: none;">
            
            <!-- Quick Action Buttons -->
            <div style="display: flex; gap: 10px; margin-bottom: 25px;">
              ${draft.phone ? `
                <a href="tel:${phoneClean}" style="flex: 1; background: ${isContact ? '#6366f1' : '#ea580c'}; color: #ffffff; text-decoration: none; padding: 12px 16px; border-radius: 8px; font-weight: 700; font-size: 14px; text-align: center; display: inline-block;">
                  📞 Call ${draft.phone}
                </a>
              ` : ''}
              ${draft.email ? `
                <a href="mailto:${draft.email}?subject=Your%20Detailing%20Inquiry%20-%20Prime%20Auto%20Detail" style="flex: 1; background: #334155; color: #38bdf8; text-decoration: none; padding: 12px 16px; border-radius: 8px; font-weight: 700; font-size: 14px; text-align: center; border: 1px solid #475569; display: inline-block;">
                  ✉️ Email Customer
                </a>
              ` : ''}
            </div>

            <!-- Customer Details Card -->
            <div style="background-color: #0f172a; padding: 20px; border-radius: 10px; border: 1px solid #334155; margin-bottom: 20px;">
              <h2 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 12px 0;">Contact Details</h2>
              <p style="font-size: 18px; color: #ffffff; margin: 0 0 8px 0; font-weight: 700;">${customerName}</p>
              ${draft.phone ? `<p style="font-size: 14px; color: #cbd5e1; margin: 4px 0;"><strong>Phone:</strong> <a href="tel:${phoneClean}" style="color: #fb923c; text-decoration: none;">${draft.phone}</a></p>` : ''}
              ${draft.email ? `<p style="font-size: 14px; color: #cbd5e1; margin: 4px 0;"><strong>Email:</strong> <a href="mailto:${draft.email}" style="color: #38bdf8; text-decoration: none;">${draft.email}</a></p>` : ''}
              ${draft.city ? `<p style="font-size: 14px; color: #cbd5e1; margin: 4px 0;"><strong>City / Location:</strong> ${draft.city}</p>` : ''}
              ${draft.address ? `<p style="font-size: 14px; color: #cbd5e1; margin: 4px 0;"><strong>Address:</strong> ${draft.address}</p>` : ''}
            </div>

            <!-- Form Selections Card -->
            <div style="background-color: #0f172a; padding: 20px; border-radius: 10px; border: 1px solid #334155; margin-bottom: 20px;">
              <h2 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 12px 0;">Form Selections (${isContact ? 'Contact Form' : 'Booking Form'})</h2>
              <p style="margin: 6px 0; color: #e2e8f0; font-size: 14px;"><strong>Service:</strong> <span style="color: #fdba74; font-weight: 600;">${draft.service_package || 'None selected'}</span></p>
              <p style="margin: 6px 0; color: #e2e8f0; font-size: 14px;"><strong>Vehicle:</strong> ${vehicleInfo}</p>
              ${!isContact && draft.add_ons ? `<p style="margin: 6px 0; color: #e2e8f0; font-size: 14px;"><strong>Add-ons:</strong> ${addOnsList}</p>` : ''}
              ${draft.preferred_timing ? `<p style="margin: 6px 0; color: #e2e8f0; font-size: 14px;"><strong>Preferred Timing:</strong> ${draft.preferred_timing}</p>` : ''}
              ${draft.preferred_date ? `<p style="margin: 6px 0; color: #e2e8f0; font-size: 14px;"><strong>Preferred Date:</strong> ${preferredDateFormatted}</p>` : ''}
              <p style="margin: 6px 0; color: #94a3b8; font-size: 12px;"><strong>Last Activity:</strong> ${new Date(draft.updated_at).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })} ET</p>
            </div>

            ${draft.message ? `
              <!-- Typed Message Card -->
              <div style="background-color: #0f172a; padding: 20px; border-radius: 10px; border: 1px solid #334155; margin-bottom: 25px;">
                <h2 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 8px 0;">Typed Message</h2>
                <p style="margin: 0; color: #e2e8f0; font-size: 14px; font-style: italic; line-height: 1.6;">"${draft.message}"</p>
              </div>
            ` : ''}

            <!-- Follow-up Center Link -->
            <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #334155;">
              <p style="font-size: 13px; color: #94a3b8; margin: 0 0 8px 0;">This inquiry is visible in your Follow-Up Center dashboard.</p>
              <a href="https://primeautodetail.com/follow-up-center" style="color: ${isContact ? '#818cf8' : '#ea580c'}; font-weight: 700; font-size: 13px; text-decoration: none;">
                Open Follow-Up Center →
              </a>
            </div>

          </div>

          <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 11px;">
            <p style="margin: 0;">Prime Auto Detail Lead Recovery System • Automated Inactivity Alert</p>
          </div>
        </div>
      `

      // Call Resend API
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: SENDER_EMAIL,
          to: [ADMIN_EMAIL],
          reply_to: draft.email || undefined,
          subject: subject,
          html: emailHtml,
        }),
      })

      const resendData = await resendRes.json()

      if (!resendRes.ok) {
        console.error(`❌ Resend error for draft ${draft.id}:`, resendData)
        continue
      }

      console.log(`✅ Alert email sent for draft ${draft.id} (Resend ID: ${resendData.id})`)

      // 5. Mark draft as notified so it never fires again
      const { error: updateErr } = await supabase
        .from('booking_drafts')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', draft.id)

      if (updateErr) {
        console.error(`❌ Failed to set notified_at for draft ${draft.id}:`, updateErr)
      } else {
        sentCount++
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: drafts.length, 
        sent: sentCount,
        daily_total: (dailyCount || 0) + sentCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err: any) {
    console.error('❌ notify-abandoned-drafts error:', err)
    return new Response(
      JSON.stringify({ error: err.message || String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
