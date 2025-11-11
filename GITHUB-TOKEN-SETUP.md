# GitHub Personal Access Token Setup

## ⚠️ GitHub Password Authentication No Longer Works

GitHub requires a **Personal Access Token (PAT)** instead of your password.

## 🔑 Create a Personal Access Token (2 minutes)

### Step 1: Go to GitHub Token Settings
Click this link: **https://github.com/settings/tokens/new**

Or manually:
1. Go to GitHub.com
2. Click your profile picture (top right)
3. Settings → Developer settings → Personal access tokens → Tokens (classic)
4. Click "Generate new token" → "Generate new token (classic)"

### Step 2: Configure Your Token

Fill in these settings:

- **Note**: `FPL Dashboard Deployment`
- **Expiration**: `90 days` (or longer if you prefer)
- **Select scopes**: 
  - ✅ `repo` (check the entire "repo" section)
  - This gives full control of private repositories

### Step 3: Generate and Copy Token

1. Scroll down and click **"Generate token"**
2. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)
3. It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## 🚀 Push to GitHub with Token

Now use the token instead of your password:

```bash
cd "/Users/chrismilne/Documents/21 FPL Dashboard/fpl-dashboard"

git push -u origin main
```

When prompted:
- **Username**: `create28`
- **Password**: Paste your token (not your GitHub password!)

## 💾 Save Token for Future Use (Optional but Recommended)

### Option 1: Use SSH Instead (Recommended)

This avoids entering tokens every time:

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"
# Press Enter 3 times (default location, no passphrase)

# Copy SSH key to clipboard
pbcopy < ~/.ssh/id_ed25519.pub

# Add to GitHub:
# 1. Go to https://github.com/settings/keys
# 2. Click "New SSH key"
# 3. Title: "MacBook"
# 4. Paste key
# 5. Click "Add SSH key"

# Change remote to SSH
cd "/Users/chrismilne/Documents/21 FPL Dashboard/fpl-dashboard"
git remote set-url origin git@github.com:create28/table-riser.git

# Now push (no password needed!)
git push -u origin main
```

### Option 2: Cache Credentials (macOS Keychain)

Store the token once:

```bash
# macOS will remember your token
git config --global credential.helper osxkeychain

# Next time you push, enter token once and it's saved
```

## 🔒 Security Notes

- ✅ Tokens are more secure than passwords
- ✅ Can be revoked without changing password
- ✅ Can have limited scopes and expiration
- ⚠️ Never commit tokens to code
- ⚠️ Treat tokens like passwords

## 📝 Quick Reference

### If you lose your token:
1. Go to https://github.com/settings/tokens
2. Delete old token
3. Generate new one
4. Use new token to push

### Token format:
```
ghp_1234567890abcdefghijklmnopqrstuvwxyz
```

### Common Error:
```
remote: Invalid username or token. Password authentication is not supported
```
**Solution**: Use token, not password!

---

**Once you have your token, try the push command again!**

