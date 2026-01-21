# 🔍 Digital Marketing Page - Performance Analysis

## Page: `/digital-marketing/social-media/dashboard`

**Analysis Date:** 2026-01-21  
**Status:** ⚠️ Needs Optimization

---

## ❌ Issues Found

### 🔴 CRITICAL: Multiple Concurrent Task ID Fetches

**Problem:**
```
DailyTaskContext - Called 10+ times concurrently
- Fetch #1: 229ms
- Fetch #2: 363ms
- Fetch #3: 537ms
- Fetch #4-10: Multiple rapid calls
⚠️ Timer conflicts (already exists / does not exist)
```

**Root Cause:**
- Multiple component re-renders triggering fetchTasks
- No request deduplication
- Race conditions between calls

**Impact:**
- Wasted database resources
- Slower page performance
- Console errors/warnings

**Solution Applied:**
- ✅ Fixed timer conflicts with unique IDs
- ✅ Added rate limiting to prevent spam

**Additional Recommendations:**
1. Add request deduplication
2. Implement debouncing (300ms)
3. Add fetching flag to prevent concurrent calls

```typescript
// Recommended implementation
const fetchingRef = useRef(false);
const lastFetchRef = useRef<number>(0);

const fetchTasksOptimized = async () => {
  // Prevent concurrent calls
  if (fetchingRef.current) return;
  
  // Debounce - wait 300ms between calls
  const now = Date.now();
  if (now - lastFetchRef.current < 300) return;
  
  fetchingRef.current = true;
  lastFetchRef.current = now;
  
  try {
    await fetchTasks();
  } finally {
    fetchingRef.current = false;
  }
};
```

---

### 🟡 MEDIUM: Duplicate Department Objectives Fetching

**Problem:**
```
useDepartmentObjectives called 3 times:
1. First component mount
2. Second component mount  
3. Third component mount
```

**Root Cause:**
- Multiple components using same hook
- No shared cache/context
- Each mount triggers separate fetch

**Impact:**
- 3x database queries for same data
- Slower page load
- Wasted resources

**Solution:**
```typescript
// Create shared context for objectives
const ObjectivesContext = createContext<DepartmentObjectives[]>([]);

export const ObjectivesProvider = ({ children }) => {
  const { data } = useDepartmentObjectives(); // Fetch once
  return (
    <ObjectivesContext.Provider value={data}>
      {children}
    </ObjectivesContext.Provider>
  );
};

// In components, use context instead of hook
const objectives = useContext(ObjectivesContext);
```

---

### 🟡 MEDIUM: Multiple Company Objectives Subscriptions

**Problem:**
```
useCompanyObjectives subscription setup: 3 times
- Each creates separate real-time channel
- Not properly cleaned up
- Resource waste
```

**Root Cause:**
- Hook called in multiple components
- Subscriptions not deduplicated
- Cleanup may be delayed

**Impact:**
- Multiple WebSocket connections
- Memory leaks potential
- Increased server load

**Solution:**
```typescript
// Centralize subscription in provider
export const CompanyObjectivesProvider = ({ children }) => {
  const [objectives, setObjectives] = useState([]);
  
  useEffect(() => {
    // Single subscription for entire app
    const channel = supabase
      .channel('company-objectives')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'company_objectives'
      }, (payload) => {
        // Update state
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  return (
    <ObjectivesContext.Provider value={objectives}>
      {children}
    </ObjectivesContext.Provider>
  );
};
```

---

### 🟡 MEDIUM: Individual Objectives Query Timeout

**Problem:**
```
⚠️ Individual objectives query timed out, using empty array
```

**Root Cause:**
- Complex query with multiple JOINs
- Large dataset
- Slow database execution

**Impact:**
- User sees empty data
- Fallback to empty array
- Poor user experience

**Solution:**

**Option 1: Optimize Query**
```sql
-- Add indexes
CREATE INDEX idx_individual_objectives_employee_id 
ON individual_objectives(employee_id);

CREATE INDEX idx_individual_objectives_organization_id 
ON individual_objectives(organization_id);

CREATE INDEX idx_individual_objectives_status 
ON individual_objectives(status);

-- Limit query scope
SELECT * FROM individual_objectives
WHERE organization_id = $1
  AND status = 'active'
  AND employee_id = $2
LIMIT 100; -- Add limit
```

**Option 2: Pagination**
```typescript
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ['individual-objectives'],
  queryFn: ({ pageParam = 0 }) => 
    fetchObjectives(pageParam, 20), // 20 per page
  getNextPageParam: (lastPage, pages) => 
    lastPage.length === 20 ? pages.length : undefined
});
```

**Option 3: Increase Timeout**
```typescript
const { data } = useQuery({
  queryKey: ['individual-objectives'],
  queryFn: fetchIndividualObjectives,
  timeout: 30000, // 30 seconds instead of default
  retry: 2
});
```

---

## 📊 Performance Metrics

### Current State:
```
Total API Calls: ~20-25 calls
Duplicate Fetches: 3x department objectives
Concurrent Fetches: 10+ task ID calls
Subscriptions: 3x company objectives
Query Timeouts: 1 (individual objectives)
Page Load Time: ~2-3 seconds
```

### After Optimization (Expected):
```
Total API Calls: ~8-10 calls (60% reduction)
Duplicate Fetches: 0 (eliminated)
Concurrent Fetches: 1 (deduplication)
Subscriptions: 1 (centralized)
Query Timeouts: 0 (optimized)
Page Load Time: ~800ms-1s (60-70% faster)
```

---

## 🚀 Recommended Optimizations

### Priority 1 (HIGH - Do Now):

1. **Add Request Deduplication to DailyTaskContext**
   - Prevent concurrent calls
   - Add debouncing (300ms)
   - Use fetching flag

2. **Fix Timer Conflicts** ✅ DONE
   - Use unique timer IDs
   - Add rate limiting

3. **Centralize Department Objectives**
   - Create shared context
   - Single fetch for all components

### Priority 2 (MEDIUM - Do Soon):

4. **Centralize Company Objectives Subscription**
   - Single subscription provider
   - Proper cleanup

5. **Optimize Individual Objectives Query**
   - Add database indexes
   - Add query limits
   - Increase timeout

6. **Implement Proper Memoization**
   - Use React.memo for expensive components
   - useMemo for computed values
   - useCallback for functions

### Priority 3 (LOW - Nice to Have):

7. **Add Loading States**
   - Show skeleton loaders
   - Better UX during fetch

8. **Implement Pagination**
   - For large datasets
   - Infinite scroll option

9. **Add Request Caching**
   - Cache common queries
   - Reduce redundant fetches

---

## 📝 Implementation Checklist

### Phase 1: Critical Fixes (1-2 hours)
- [x] Fix timer conflicts in DailyTaskContext
- [ ] Add request deduplication
- [ ] Add debouncing to prevent rapid calls
- [ ] Create shared ObjectivesContext

### Phase 2: Medium Priority (2-3 hours)
- [ ] Centralize company objectives subscription
- [ ] Optimize individual objectives query
- [ ] Add database indexes
- [ ] Implement proper memoization

### Phase 3: Polish (1-2 hours)
- [ ] Add loading states
- [ ] Implement pagination
- [ ] Add request caching
- [ ] Test and verify improvements

**Total Estimated Time:** 4-7 hours  
**Expected Performance Gain:** 60-70% faster page loads

---

## 🧪 Testing Plan

### Before Optimization:
```bash
# Measure performance
1. Open /digital-marketing/social-media/dashboard
2. Open DevTools Console
3. Count API calls (should be ~20-25)
4. Measure page load time (should be ~2-3s)
5. Note duplicate fetches in console
```

### After Optimization:
```bash
# Verify improvements
1. Refresh page with cache cleared
2. Count API calls (should be ~8-10) ✅
3. Measure page load time (should be ~1s) ✅
4. Verify no duplicate logs ✅
5. Check for timer errors (should be 0) ✅
```

---

## ✅ Quick Wins Applied

1. ✅ **Fixed Timer Conflicts**
   - Changed to unique timer IDs
   - Added rate limiting
   - Resolved console warnings

**Next Steps:**
- Apply remaining optimizations from Priority 1
- Test improvements
- Monitor performance metrics

---

## 📈 Expected Impact

### User Experience:
- ⚡ 60-70% faster page loads
- ✨ Smoother interactions
- 🚀 Better perceived performance
- 💪 More responsive UI

### Technical:
- 📉 60% reduction in API calls
- 🗄️ Lower database load
- 💾 Better memory usage
- 🔌 Fewer WebSocket connections

### Business:
- 💰 Lower server costs
- 📈 Better scalability
- 👥 Support more users
- ⭐ Improved user satisfaction

---

**Status:** ⚠️ Partially Optimized (Timer fixes applied)  
**Remaining Work:** Request deduplication, context centralization  
**Priority:** HIGH  
**Estimated Completion:** 4-7 hours

---

**Next Action:** Implement request deduplication in DailyTaskContext
