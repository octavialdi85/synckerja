# Manual Test - Validate Magic Link

## Test Using cURL

```bash
curl -X POST 'https://najgdwffjhnqlogfrlqa.supabase.co/functions/v1/validate-magic-link' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{
    "token": "12a43d8a-4479-4e29-9a44-74224586b8c5-v1384vb799g"
  }'
```

## Test Using Postman

1. **Method:** POST
2. **URL:** `https://najgdwffjhnqlogfrlqa.supabase.co/functions/v1/validate-magic-link`
3. **Headers:**
   - `Content-Type`: `application/json`
   - `Authorization`: `Bearer YOUR_ANON_KEY`
4. **Body (raw JSON):**
```json
{
  "token": "12a43d8a-4479-4e29-9a44-74224586b8c5-v1384vb799g"
}
```

## Expected Response

### Success Response (200):
```json
{
  "valid": true,
  "email": "papadhanta@gmail.com",
  "fullName": "User Full Name",
  "organizationId": "some-org-id"
}
```

### Error Response (400):
```json
{
  "valid": false,
  "error": "Magic link tidak valid atau sudah kedaluwarsa"
}
```

## After Successful Test

Check database immediately:

```sql
SELECT 
  email,
  email_verified,
  used_at,
  status
FROM magic_links
WHERE token = '12a43d8a-4479-4e29-9a44-74224586b8c5-v1384vb799g';
```

Expected result:
- `email_verified` = `TRUE` ✅
- `used_at` = [timestamp] ✅

## Troubleshooting

### If email_verified is still FALSE:

1. **Check RLS Policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'magic_links';
```

2. **Check Edge Function Logs:**
- Go to Supabase Dashboard
- Navigate to Edge Functions > validate-magic-link
- Check logs for errors

3. **Manual Update (Emergency Only):**
```sql
-- Only use if absolutely necessary for testing
UPDATE magic_links
SET 
  email_verified = true,
  used_at = NOW()
WHERE token = '12a43d8a-4479-4e29-9a44-74224586b8c5-v1384vb799g';
```

## Debug Console Commands

Open browser console and run:

```javascript
// Test validate magic link
const testValidation = async () => {
  const { createClient } = window.supabase;
  const supabase = createClient(
    'https://najgdwffjhnqlogfrlqa.supabase.co',
    'YOUR_ANON_KEY'
  );
  
  const { data, error } = await supabase.functions.invoke('validate-magic-link', {
    body: { 
      token: '12a43d8a-4479-4e29-9a44-74224586b8c5-v1384vb799g'
    }
  });
  
  console.log('Validation Result:', { data, error });
  return { data, error };
};

// Run the test
testValidation();
```

