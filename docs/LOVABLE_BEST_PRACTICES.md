# Lovable AI Agent - Best Practices & Guidelines

This document provides guidelines for working with the Lovable AI agent to ensure consistent, high-quality code generation and avoid common pitfalls.

## 🎯 Core Principles

### 1. Always Reference Existing Code
When asking Lovable to modify or extend features, always reference the existing implementation:

**Good**: "Update the BookingWizard component to add a new step for insurance selection, following the same pattern as the equipment selection step"

**Bad**: "Add insurance selection to booking"

### 2. Be Specific About File Locations
Lovable works best when you specify exact file paths:

**Good**: "Modify `src/components/booking/BookingWizard.tsx` to add validation for minimum booking duration"

**Bad**: "Add validation to the booking wizard"

### 3. Reference the Architecture
Point Lovable to this documentation when making significant changes:

**Good**: "Following the architecture in docs/ARCHITECTURE.md, add a new table for court maintenance schedules"

**Bad**: "Add maintenance scheduling"

---

## 📋 Prompting Best Practices

### Feature Implementation

#### Template for New Features
```
I want to add [FEATURE NAME] to the platform.

Context:
- This feature is for [USER ROLE]
- It should work similar to [EXISTING FEATURE]
- Reference: docs/FEATURE_INVENTORY.md

Requirements:
1. [Specific requirement 1]
2. [Specific requirement 2]
3. [Specific requirement 3]

Files to modify:
- [File path 1]
- [File path 2]

Please follow the existing patterns in [SIMILAR COMPONENT].
```

#### Template for Bug Fixes
```
There's a bug in [COMPONENT/FEATURE].

Current behavior:
- [What's happening now]

Expected behavior:
- [What should happen]

Steps to reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Affected file: [FILE PATH]
```

### Database Changes

#### Template for Schema Changes
```
I need to add a new table/column for [FEATURE].

Reference the existing schema pattern in [SIMILAR TABLE].

Table: [TABLE_NAME]
Columns:
- [column_name]: [type] - [description]
- [column_name]: [type] - [description]

Relationships:
- [Relationship description]

RLS Policies:
- [Policy description]

Please also create the TypeScript types in src/integrations/supabase/types.
```

---

## 🚫 Common Pitfalls to Avoid

### 1. Don't Ask for Complete Rewrites
Lovable works best with incremental changes. Break large features into smaller tasks.

**Bad**: "Rewrite the entire booking system to support multi-day bookings"

**Good**: 
1. "Add a date range picker to BookingWizard"
2. "Update availability checking to support date ranges"
3. "Modify booking creation to handle multi-day bookings"

### 2. Don't Assume Context
Always provide context, even if you think it's obvious:

**Bad**: "Add the feature we discussed"

**Good**: "Add the waitlist feature we discussed. Users should be able to join a waitlist when a time slot is fully booked. Reference the booking hold system in `src/hooks/useBookingHold.ts` for similar patterns."

### 3. Don't Skip Testing Instructions
Always specify how the feature should be tested:

**Good**: "After implementing, test by:
1. Creating a booking as a player
2. Verifying the hold countdown appears
3. Completing payment
4. Checking the booking appears in the manager dashboard"

### 4. Don't Ignore Existing Patterns
Point out existing patterns to follow:

**Good**: "Follow the same hook pattern as `useManagerVenues.ts` when creating the new `useVenueAnalytics.ts` hook"

---

## 🏗️ Architecture Guidelines for Lovable

### Component Structure
When asking for new components, specify the structure:

```
Create a new component: [ComponentName]

Location: src/components/[category]/[ComponentName].tsx

Props:
- [propName]: [type] - [description]

State:
- [stateName]: [description]

Hooks to use:
- [hookName] from [path]

UI Components:
- Use shadcn/ui components: [Button, Card, etc.]

Follow the pattern in: [SIMILAR_COMPONENT]
```

### Hook Creation
```
Create a new hook: [hookName]

Location: src/hooks/[hookName].ts

Purpose: [Description]

Dependencies:
- Supabase query for [TABLE]
- React Query for caching

Return type:
{
  data: [TYPE]
  isLoading: boolean
  error: Error | null
  [mutationName]: () => void
}

Follow the pattern in: [SIMILAR_HOOK]
```

### Database Queries
```
Add a new Supabase query in [HOOK_NAME]:

Query: [DESCRIPTION]

Tables: [TABLE_NAMES]

Filters:
- [filter description]

Joins:
- [join description]

RLS: Ensure RLS policies allow this query for [ROLE]

Use React Query with:
- queryKey: ['[key]', [params]]
- staleTime: [duration]
```

---

## 🎨 UI/UX Guidelines for Lovable

### Styling
- Always use Tailwind CSS classes
- Follow the existing color scheme (primary, secondary, accent)
- Use shadcn/ui components for consistency
- Ensure responsive design (mobile-first)

### Accessibility
- Include ARIA labels
- Ensure keyboard navigation
- Maintain color contrast
- Add loading states
- Show error messages clearly

### Internationalization
When adding new text:
```
Add new translation keys to:
- src/i18n/locales/en/[namespace].json
- src/i18n/locales/pt/[namespace].json

Use the useTranslation hook:
const { t } = useTranslation('[namespace]');

Text: {t('[key]')}
```

---

## 🔄 Iterative Development with Lovable

### Step 1: Plan
Before asking Lovable to implement:
1. Review docs/FEATURE_INVENTORY.md to avoid duplication
2. Check docs/ARCHITECTURE.md for patterns
3. Identify files that need changes
4. Break feature into small tasks

### Step 2: Implement
For each task:
1. Provide clear, specific prompt
2. Reference existing code
3. Specify testing steps
4. Review generated code

### Step 3: Test
After Lovable implements:
1. Test the feature manually
2. Check for console errors
3. Verify database changes
4. Test edge cases

### Step 4: Refine
If issues found:
1. Provide specific feedback
2. Reference the generated code
3. Explain what's wrong and why
4. Suggest the fix

---

## 📝 Documentation Updates

After Lovable implements a feature, update:

1. **docs/FEATURE_INVENTORY.md**: Add to implemented features
2. **docs/ARCHITECTURE.md**: Update if architecture changed
3. **docs/ROADMAP.md**: Mark as complete, update metrics
4. **README.md**: Update if setup process changed

---

## 🔍 Code Review Checklist

After Lovable generates code, verify:

### Functionality
- [ ] Feature works as specified
- [ ] Edge cases handled
- [ ] Error states handled
- [ ] Loading states shown

### Code Quality
- [ ] Follows existing patterns
- [ ] No duplicate code
- [ ] Proper TypeScript types
- [ ] No console.log statements
- [ ] Proper error handling

### Database
- [ ] RLS policies correct
- [ ] Indexes added if needed
- [ ] Foreign keys correct
- [ ] Types generated

### UI/UX
- [ ] Responsive design
- [ ] Accessible
- [ ] Consistent styling
- [ ] Loading states
- [ ] Error messages

### Internationalization
- [ ] All text translated
- [ ] Translation keys added
- [ ] Both languages updated

### Security
- [ ] No sensitive data exposed
- [ ] Authentication checked
- [ ] Authorization correct
- [ ] Input validated

---

## 🚀 Example Workflows

### Adding a New Feature

1. **Check Documentation**
```
Review docs/FEATURE_INVENTORY.md and docs/ROADMAP.md
Confirm feature is planned and not already implemented
```

2. **Plan Implementation**
```
Identify:
- Database changes needed
- Components to create/modify
- Hooks to create/modify
- Routes to add
- Translations needed
```

3. **Prompt Lovable (Database)**
```
I need to add database support for [FEATURE].

Following the pattern in [EXISTING_TABLE], create:

Table: [table_name]
Columns: [list columns with types]
RLS Policies: [describe policies]

Also update src/integrations/supabase/types.
```

4. **Prompt Lovable (Backend Logic)**
```
Create a new hook: use[FeatureName]

Location: src/hooks/use[FeatureName].ts

Follow the pattern in src/hooks/[SimilarHook].ts

Queries needed:
- [query 1 description]
- [query 2 description]

Mutations needed:
- [mutation 1 description]
```

5. **Prompt Lovable (UI Components)**
```
Create a new component: [ComponentName]

Location: src/components/[category]/[ComponentName].tsx

Use the hook: use[FeatureName]

UI should include:
- [element 1]
- [element 2]

Follow the design pattern in: [SimilarComponent]
```

6. **Prompt Lovable (Integration)**
```
Integrate [ComponentName] into [ParentComponent]

Location: [file path]

Add it [where in the component]

Pass these props: [list props]
```

7. **Prompt Lovable (Translations)**
```
Add translations for [FEATURE]

Files:
- src/i18n/locales/en/[namespace].json
- src/i18n/locales/pt/[namespace].json

Keys needed:
- [key]: [English text] / [Portuguese text]
```

8. **Test & Refine**
```
Test the feature:
1. [Test step 1]
2. [Test step 2]

If issues, provide specific feedback to Lovable
```

9. **Update Documentation**
```
Update docs/FEATURE_INVENTORY.md to mark feature as implemented
```

---

## 💡 Pro Tips

### 1. Use the .lovable/plan.md File
Lovable reads this file for context. Keep it updated with current work:
```
Update .lovable/plan.md with:
- Current feature being worked on
- Known issues
- Next steps
```

### 2. Reference Similar Features
Always point to similar existing features:
```
"Implement [NEW_FEATURE] following the same pattern as [EXISTING_FEATURE]"
```

### 3. Break Down Complex Features
Don't ask for everything at once:
```
Phase 1: Database schema
Phase 2: Backend hooks
Phase 3: UI components
Phase 4: Integration
Phase 5: Testing & refinement
```

### 4. Provide Examples
Show Lovable what you want:
```
"Add a filter dropdown similar to the sport filter in src/components/courts/MobileCourtFilters.tsx"
```

### 5. Specify Error Handling
Don't forget error cases:
```
"Handle these error cases:
- User not authenticated
- Booking slot no longer available
- Payment failed
- Network error"
```

---

## 🐛 Debugging with Lovable

When something doesn't work:

### 1. Provide Error Details
```
There's an error in [COMPONENT]:

Error message: [exact error message]

Console output: [paste console output]

File: [file path]
Line: [line number]

What I was doing: [steps to reproduce]
```

### 2. Show Current Code
```
The current code in [FILE] is:

[paste relevant code section]

The issue is: [describe issue]

Expected behavior: [what should happen]
```

### 3. Suggest Fix
```
I think the issue is [your analysis].

Could you update [FILE] to [suggested fix]?

Reference: [similar working code]
```

---

## 📚 Additional Resources

- **Supabase Docs**: https://supabase.com/docs
- **React Query Docs**: https://tanstack.com/query/latest
- **shadcn/ui Docs**: https://ui.shadcn.com
- **Tailwind CSS Docs**: https://tailwindcss.com/docs

---

**Last Updated**: 2026-04-18
**Maintained By**: Development Team

**Remember**: Lovable is a powerful tool, but it works best with clear, specific instructions and proper context. Always reference existing code and patterns!
