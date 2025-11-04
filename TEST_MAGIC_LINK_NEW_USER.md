# 🧪 Test Magic Link - New User (No Password)

## 📋 Test Setup

**User Details:**
- Email: `papadhanta@gmail.com`
- User ID: `848fb258-70b3-4384-a5c0-8a4b84e15a2a`
- Status: New user (belum pernah login)
- Password: **NULL** (belum set) ✅
- Magic Link ID: `e9c3f852-b345-46df-96e7-d38252468441`

**Database State:**
```sql
-- auth.users
id: 848fb258-70b3-4384-a5c0-8a4b84e15a2a
email: papadhanta@gmail.com
encrypted_password: NULL  ← No password yet! ✅
email_confirmed_at: NULL

-- magic_links
id: e9c3f852-b345-46df-96e7-d38252468441
status: pending
email_verified: false
used_at: NULL
```

---

## 🧪 Test Steps

### Step 1: Get Magic Link Token

Query database untuk token:
```sql
SELECT token FROM magic_links 
WHERE id = 'e9c3f852-b345-46df-96e7-d38252468441';
```

### Step 2: Construct Magic Link URL

```
http://localhost:8080/first-login?token=[TOKEN]&magic_link=true
```

### Step 3: Click Magic Link

Navigate to URL above

### Step 4: Expected Behavior

**Should See:**
```
1. Loading spinner: "Memvalidasi undangan..."
   ↓
2. SetPasswordForm appears with:
   ✅ Email field (disabled, pre-filled with papadhanta@gmail.com)
   ✅ Password field (empty, ready for input)
   ✅ Confirm Password field (empty)
   ✅ "Atur Password" button
   ↓
3. User enters password
   ↓
4. Click "Atur Password"
   ↓
5. Success! Redirect to /login
```

**Should NOT See:**
```
❌ Immediate redirect to /login (without password form)
❌ Error: "Link tidak valid"
❌ Error: "Token sudah kedaluwarsa"
```

---

## 🔍 Expected Console Logs

```javascript
🔍 FirstLogin: Validating token: [token]...

// validate-magic-link edge function:
[validate-magic-link] Validating token: ...
[validate-magic-link] Searching for magic link in database
[validate-magic-link] Magic link found for user: 848fb258...
[validate-magic-link] Updating email_verified to TRUE
[validate-magic-link] Successfully updated email_verified to TRUE
[validate-magic-link] Fetching user details from auth
[validate-magic-link] Validation successful

// Frontend:
✅ FirstLogin: Token valid, setting validation data
```

**Then user should see SetPasswordForm (NO redirect!)**

---

## 📊 After Password Setup

### Database Changes:

```sql
-- auth.users
encrypted_password: [hash]  ← NOW HAS PASSWORD ✅
email_confirmed_at: [timestamp] ✅

-- magic_links
status: 'completed' ✅
email_verified: true ✅
used_at: [timestamp] ✅

-- profiles
email_verified: true ✅
active_organization_id: [org_id] ✅
```

---

## 🐛 If Still Redirects to /login

### Possible Causes:

1. **User already has password in auth.users**
   - Check: `SELECT encrypted_password FROM auth.users WHERE id = '848fb258...'`
   - Should be: `NULL`
   - If not NULL: Password was set somehow

2. **ProtectedRoute blocking access**
   - Already fixed: `requiresAuth={false}` on `/first-login` route
   - Should allow unauthenticated access

3. **Component logic issue**
   - FirstLogin should show SetPasswordForm
   - Check: validationData is set correctly

### Debug Steps:

1. **Check user password:**
   ```sql
   SELECT 
     id,
     email,
     CASE 
       WHEN encrypted_password IS NULL THEN 'NO PASSWORD'
       ELSE 'HAS PASSWORD'
     END as password_status
   FROM auth.users
   WHERE email = 'papadhanta@gmail.com';
   ```

2. **Check magic link:**
   ```sql
   SELECT 
     token,
     status,
     email_verified,
     used_at
   FROM magic_links
   WHERE id = 'e9c3f852-b345-46df-96e7-d38252468441';
   ```

3. **Open browser console (F12):**
   - Look for FirstLogin logs
   - Check if validationData is set
   - Check for redirect logs

---

## 🔧 Manual Password Reset (If Needed)

If user somehow has password already:

```sql
-- Reset password to NULL
UPDATE auth.users
SET encrypted_password = NULL
WHERE id = '848fb258-70b3-4384-a5c0-8a4b84e15a2a';

-- Reset magic link
UPDATE magic_links
SET 
  status = 'pending',
  email_verified = false,
  used_at = NULL
WHERE id = 'e9c3f852-b345-46df-96e7-d38252468441';
```

Then click magic link again.

---

## ✅ Expected Success Flow

```
1. User receives invitation email
   ↓
2. Clicks magic link
   ↓
3. ✅ Redirects to /first-login?token=XXX&magic_link=true
   ↓
4. ✅ Loading: "Memvalidasi undangan..."
   ↓
5. ✅ Token validated
   ↓
6. ✅ email_verified = TRUE in magic_links table
   ↓
7. ✅ SetPasswordForm appears
   ↓
8. User enters password
   ↓
9. ✅ Password set successfully
   ↓
10. ✅ magic_links.status = 'completed'
    ↓
11. ✅ Redirect to /login
    ↓
12. User can login with new password
```

---

## 🎯 Test Now

1. **Refresh browser:** `Ctrl + Shift + R`
2. **Get magic link token from database**
3. **Construct URL:** `http://localhost:8080/first-login?token=[TOKEN]&magic_link=true`
4. **Navigate to URL**
5. **Expected:** Setup password form appears ✅

---

**If it works: SUCCESS! User can setup password via magic link!** 🎉  
**If still redirects: Check database - user might have auto-generated password**

