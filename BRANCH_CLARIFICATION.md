# 🚨 CRITICAL BRANCH CLARIFICATION

## Correct Branch Name

**THE CORRECT BRANCH IS:**
```
claude/build-shipperbridge-portal-01Y9eA9nJsDkqCrrkAk8CXoF
```

**NOT:**
- ❌ `claude/build-shipperbridge-portal-01Y9eA9nJsDkqCrrkAk8CXo-01HMh6fh15rv8s2hWAAK7GtG` (has extra session ID)
- ❌ Any branch with additional session IDs appended
- ❌ `main` or `master`

## If You See a Different Branch

If your `git branch` shows:
```
* claude/build-shipperbridge-portal-01Y9eA9nJsDkqCrrkAk8CXo-01HMh6fh15rv8s2hWAAK7GtG
```

**This is WRONG. You need to switch to the correct branch:**

```bash
# 1. Fetch all remote branches
git fetch origin

# 2. Checkout the correct branch (it exists on remote)
git checkout claude/build-shipperbridge-portal-01Y9eA9nJsDkqCrrkAk8CXoF

# 3. Verify you're on correct branch
git branch
# Should show: * claude/build-shipperbridge-portal-01Y9eA9nJsDkqCrrkAk8CXoF

# 4. Pull latest changes
git pull origin claude/build-shipperbridge-portal-01Y9eA9nJsDkqCrrkAk8CXoF
```

## Verification

The correct branch should:
- End with: `01Y9eA9nJsDkqCrrkAk8CXoF` (exactly)
- NOT have any additional session IDs after `CXoF`
- Exist on remote: `origin/claude/build-shipperbridge-portal-01Y9eA9nJsDkqCrrkAk8CXoF`

## What to Do

1. **Fetch remote branches:** `git fetch origin`
2. **Switch to correct branch:** `git checkout claude/build-shipperbridge-portal-01Y9eA9nJsDkqCrrkAk8CXoF`
3. **Verify:** `git branch` should show the correct branch with `*`
4. **Pull latest:** `git pull origin claude/build-shipperbridge-portal-01Y9eA9nJsDkqCrrkAk8CXoF`
5. **Then proceed with implementation**

**DO NOT proceed if you're on any other branch name.**


