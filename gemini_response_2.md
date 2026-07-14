# Why the App didn't update to "Accepted"

Ah, I know exactly why this happened! 

When we set up the Supabase permissions (RLS) earlier, I only had you create a **SELECT** policy. This allowed Ashley to *read* the estimate.

However, when she clicked "ACCEPT THIS ESTIMATE", her browser tried to **UPDATE** the estimate in your database to change its status to "accepted". Because we didn't create an `UPDATE` policy, Supabase blocked her submission! She likely got a red error message on her screen, and the CRM never got the memo that she accepted it.

### How to Fix This (Add the UPDATE policy):

1. Go back to that exact same Supabase screen (**Authentication -> Policies**).
2. Click **Create policy** on the `estimates` table.
3. Choose **Create a policy from scratch**.
4. Fill it out exactly like this:
   * **Policy Name:** `Allow public to update estimates`
   * **Allowed operation:** `UPDATE`
   * **Target roles:** `anon`
   * **USING expression:** `true`
   * **WITH CHECK expression:** `true`
5. Click **Save / Review**.

Once you add this second policy, when she clicks "Accept" or "Decline", her browser will be allowed to update the database, and your app will instantly change from "NO ANSWER" to "ACCEPTED"!

*(Also, I have successfully pushed all untracked files to your GitHub as requested! I will continue creating a new numbered file for my responses so nothing gets overwritten.)*
