# Initiative Tab - Display Filter Rules

## 🎯 Purpose
Tab Initiative menampilkan **semua item yang bisa dikerjakan langsung** (actionable items), bukan parent items yang masih punya child items.

---

## 📋 Filter Rules

### ✅ DITAMPILKAN (Actionable Items):

#### 1. **Tasks (WITHOUT Steps)**
```sql
SELECT * FROM daily_tasks
WHERE organization_id = ?
  AND status NOT IN ('completed', 'cancelled')
  AND has_substeps = false  -- ⚠️ KUNCI: Hanya task tanpa steps
```

**Kondisi:**
- Status: `pending` atau `in_progress`
- Bukan `completed` atau `cancelled`
- ✅ `has_substeps = false` (TIDAK punya steps)

**Alasan:** 
- Task tanpa steps bisa dikerjakan langsung
- Task dengan steps = work on steps instead

---

#### 2. **Steps (WITHOUT Sub-steps)**
```sql
SELECT * FROM task_steps
WHERE organization_id = ?
  AND is_completed = false
  AND has_substeps = false  -- ⚠️ KUNCI: Hanya step tanpa sub-steps
  AND daily_tasks.status NOT IN ('cancelled')
```

**Kondisi:**
- ✅ `is_completed = false` (belum selesai)
- ✅ `has_substeps = false` (TIDAK punya sub-steps)
- ✅ Parent task bukan cancelled

**Alasan:** Step tanpa sub-steps bisa dikerjakan langsung

---

#### 3. **Sub-steps (Leaf Items)**
```sql
SELECT * FROM task_steps_to_steps
WHERE organization_id = ?
  AND is_completed = false
```

**Kondisi:**
- ✅ `is_completed = false` (belum selesai)

**Alasan:** Sub-steps adalah level paling bawah, selalu actionable

---

### ❌ TIDAK DITAMPILKAN:

#### 1. **Tasks WITH Steps**
```sql
-- ❌ TIDAK ditampilkan
SELECT * FROM daily_tasks
WHERE has_substeps = true
```

**Alasan:**
- Task ini punya child items (steps)
- Yang perlu dikerjakan adalah steps-nya
- Menampilkan parent task akan redundant dan membingungkan

**Contoh:**
```
❌ Task: "Buat Estimasi untuk budgeting" (has_substeps = true)
   ✅ Step: "Research budget items"
   ✅ Step: "Calculate costs"
   ✅ Step: "Create presentation"
```
→ Hanya tampilkan steps, bukan parent task

---

#### 2. **Steps WITH Sub-steps**
```sql
-- ❌ TIDAK ditampilkan
SELECT * FROM task_steps
WHERE has_substeps = true
```

**Alasan:** 
- Step ini punya child items (sub-steps)
- Yang perlu dikerjakan adalah sub-steps-nya
- Menampilkan parent step akan redundant dan membingungkan

**Contoh:**
```
❌ Step: "Research budget items" (has_substeps = true)
   ✅ Sub-step: "Find suppliers"
   ✅ Sub-step: "Get quotes"
   ✅ Sub-step: "Compare prices"
```
→ Hanya tampilkan sub-steps, bukan parent step

---

#### 3. **Completed Items**
```sql
-- ❌ TIDAK ditampilkan
WHERE is_completed = true
  OR status = 'completed'
```

**Alasan:** Sudah selesai, tidak perlu dikerjakan

---

#### 4. **Cancelled Items**
```sql
-- ❌ TIDAK ditampilkan
WHERE status = 'cancelled'
```

**Alasan:** Dibatalkan, tidak perlu dikerjakan

---

## 🔍 Contoh Struktur Data

### Database Structure:
```
Task 1: "Buat Estimasi untuk budgeting" (has_substeps = true) ❌ HIDDEN
├─ Step 1.1: "Research budget" (has_substeps = true) ❌ HIDDEN
│  ├─ Sub-step 1.1.1: "Find suppliers" ✅ SHOWN
│  ├─ Sub-step 1.1.2: "Get quotes" ✅ SHOWN
│  └─ Sub-step 1.1.3: "Compare prices" ✅ SHOWN
├─ Step 1.2: "Calculate costs" (has_substeps = false) ✅ SHOWN
└─ Step 1.3: "Create report" (has_substeps = false) ✅ SHOWN

Task 2: "Quick Fix" (has_substeps = false) ✅ SHOWN
Task 3: "Suntik Review Shopee" (has_substeps = true) ❌ HIDDEN
└─ Step 3.1: "Write review" (has_substeps = false) ✅ SHOWN
```

### Initiative Tab Display:
```
✅ Task 2: "Quick Fix" ← Task WITHOUT steps
✅ Sub-step: "Find suppliers" (dari Task 1 > Step 1.1)
✅ Sub-step: "Get quotes" (dari Task 1 > Step 1.1)
✅ Sub-step: "Compare prices" (dari Task 1 > Step 1.1)
✅ Step: "Calculate costs" (dari Task 1 > Step 1.2)
✅ Step: "Create report" (dari Task 1 > Step 1.3)
✅ Step: "Write review" (dari Task 3 > Step 3.1)
```

**NOT Shown:**
- ❌ Task 1: "Buat Estimasi untuk budgeting" (has_substeps = true)
- ❌ Task 3: "Suntik Review Shopee" (has_substeps = true)
- ❌ Step 1.1: "Research budget" (has_substeps = true)

---

## 💡 Business Logic

### Hierarchy Rule:
```
IF (item is Task):
    IF (has_substeps = false):
        SHOW ✅ (can work on it directly)
    ELSE:
        HIDE ❌ (work on steps instead)

ELIF (item is Step):
    IF (has_substeps = false):
        SHOW ✅ (can work on it directly)
    ELSE:
        HIDE ❌ (work on sub-steps instead)

ELIF (item is Sub-step):
    SHOW ✅ (leaf item, always actionable)
```

### Completion Rule:
```
HIDE if:
- is_completed = true
- status = 'completed'
- parent task status = 'cancelled'
```

---

## 🎯 Benefits

### 1. **No Redundancy**
- Tidak menampilkan parent step yang punya sub-steps
- Fokus pada items yang bisa dikerjakan

### 2. **Clear Action Items**
- User hanya lihat apa yang perlu dikerjakan
- Tidak bingung harus kerjakan parent atau child

### 3. **Better UX**
- List lebih clean
- Fokus pada actionable items
- Tidak ada duplicate work

---

## 🧪 Test Cases

### Test 1: Step with sub-steps
```
Given: Step "Research" has 3 sub-steps
When: Load Initiative tab
Then: 
  ❌ Step "Research" NOT shown
  ✅ 3 sub-steps ARE shown
```

### Test 2: Step without sub-steps
```
Given: Step "Calculate" has NO sub-steps
When: Load Initiative tab
Then:
  ✅ Step "Calculate" IS shown
```

### Test 3: Completed items
```
Given: Step "Write report" is completed
When: Load Initiative tab
Then:
  ❌ Step "Write report" NOT shown
```

### Test 4: Parent task cancelled
```
Given: Task is cancelled with 5 incomplete steps
When: Load Initiative tab
Then:
  ❌ Task NOT shown
  ❌ All steps NOT shown
```

---

## 📊 Query Performance

### Optimization Applied:
- ✅ Index on `has_substeps` column
- ✅ Index on `is_completed` column
- ✅ Filter at database level (not in code)
- ✅ Efficient JOIN with daily_tasks

### Expected Performance:
- Query time: <100ms
- No N+1 queries
- Single query per item type

---

## 🔄 Related Files

1. **TaskInitiative.tsx**
   - Main component
   - Query implementation
   - Display logic

2. **TaskInitiativeFooter.tsx**
   - Shows total count
   - Shows unassigned count
   - Explains what's shown

3. **Database Schema**
   - `daily_tasks` table
   - `task_steps` table (with `has_substeps` column)
   - `task_steps_to_steps` table

---

## 📝 Notes

- `has_substeps` column must be maintained properly
- When sub-step is added: `UPDATE task_steps SET has_substeps = true`
- When last sub-step deleted: `UPDATE task_steps SET has_substeps = false`
- This is typically handled by database triggers

---

**Last Updated:** $(date)

