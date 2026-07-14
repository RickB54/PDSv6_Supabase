# Yes, everything will update automatically!

**1. Will Ashley still be able to select the buttons?**
Yes! Because you added the `UPDATE` policy, her browser is now officially allowed to save her decision into your database. 

**2. Why hasn't it updated yet?**
Because her *first* attempt to accept the estimate was blocked by the security policy, her decision was rejected by the database and vanished. For it to update, she just needs to open that exact same link and click "Accept" one more time! (Alternatively, since she already told you she accepted it, you can just click the yellow pencil on her row in the `Estimates` page and manually mark it as "Accepted" so you don't have to bother her).

**3. Will it update everywhere in the app?**
Yes! All pages in your CRM (the `Bookings Analytics` page you screenshotted, the `Estimates` pipeline, the graphs, etc.) pull their data directly from your Supabase database. Because her click will now successfully write to the database, her "Accepted" status will instantly ripple across your entire application automatically. Every chart and table will update.
