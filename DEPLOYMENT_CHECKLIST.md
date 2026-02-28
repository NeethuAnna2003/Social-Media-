# Deployment Checklist

## ✅ Pre-Deployment Checklist

### Backend Setup

- [ ] **Run Migrations**
  ```bash
  cd backend
  python manage.py makemigrations posts
  python manage.py migrate posts
  ```

- [ ] **Verify Models**
  - [ ] ImageLocationCache
  - [ ] PostLocation
  - [ ] ProhibitedWordRequest
  - [ ] ProhibitedWord
  - [ ] FilteredComment

- [ ] **Test API Endpoints**
  - [ ] Location detection endpoint
  - [ ] Word filter request endpoints
  - [ ] Admin review endpoints

- [ ] **Configure Environment Variables** (Optional)
  ```bash
  # Add to backend/.env
  GOOGLE_VISION_API_KEY=your_api_key_here
  ```

- [ ] **Create Admin User** (if needed)
  ```bash
  python manage.py createsuperuser
  ```

### Frontend Integration

- [ ] **Import Components**
  - [ ] PostLocation component
  - [ ] FilteredComment component
  - [ ] WordFilterManager component
  - [ ] AdminWordFilterPanel component

- [ ] **Add Routes**
  - [ ] `/settings/word-filter` → WordFilterManager
  - [ ] `/admin/word-filter` → AdminWordFilterPanel

- [ ] **Update PostCard**
  - [ ] Add `<PostLocation locationData={post.location_data} />`

- [ ] **Update CommentList**
  - [ ] Replace comment rendering with `<FilteredComment />`

- [ ] **Update Navigation**
  - [ ] Add link to Word Filter Manager in settings
  - [ ] Add link to Admin Panel for admins

### Testing

- [ ] **Test Location Detection**
  - [ ] Upload post with image
  - [ ] Verify location appears (wait 2-3 seconds)
  - [ ] Check different image types
  - [ ] Verify caching works (same image)

- [ ] **Test Comment Filtering**
  - [ ] User requests prohibited words
  - [ ] Admin approves request
  - [ ] User comments with prohibited word
  - [ ] Verify visibility rules:
    - [ ] Commenter sees red comment with warning
    - [ ] Post owner doesn't see comment
    - [ ] Other users don't see comment

- [ ] **Test Admin Panel**
  - [ ] View pending requests
  - [ ] Approve a request
  - [ ] Reject a request
  - [ ] View filtered comments

- [ ] **Test Edge Cases**
  - [ ] Post without image (no location)
  - [ ] Comment without prohibited words
  - [ ] Toggle filter on/off
  - [ ] Delete filter

### Security Checks

- [ ] **Permissions**
  - [ ] Only authenticated users can request filters
  - [ ] Only admins can approve/reject
  - [ ] Only post owner sees filtered comments list

- [ ] **Data Validation**
  - [ ] Word requests validated
  - [ ] Admin notes optional
  - [ ] Image hash uniqueness enforced

- [ ] **Error Handling**
  - [ ] API errors handled gracefully
  - [ ] Migration errors checked
  - [ ] Service errors logged

### Performance

- [ ] **Database Indexes**
  - [ ] Verify indexes created by migration
  - [ ] Check query performance

- [ ] **Caching**
  - [ ] Location cache working
  - [ ] No duplicate API calls

- [ ] **Async Processing**
  - [ ] Location detection doesn't block post creation
  - [ ] Background threads working

### Documentation

- [ ] **Read Documentation**
  - [ ] FEATURES_README.md
  - [ ] INTEGRATION_GUIDE.md
  - [ ] LOCATION_AND_FILTER_FEATURES.md
  - [ ] IMPLEMENTATION_SUMMARY.md

- [ ] **Update Project README**
  - [ ] Add feature descriptions
  - [ ] Update API documentation
  - [ ] Add screenshots (optional)

### Deployment

- [ ] **Code Review**
  - [ ] Review all new files
  - [ ] Check for console.log statements
  - [ ] Verify error handling

- [ ] **Build Frontend**
  ```bash
  cd frontend
  npm run build
  ```

- [ ] **Collect Static Files** (if using Django static)
  ```bash
  python manage.py collectstatic
  ```

- [ ] **Restart Services**
  - [ ] Backend server
  - [ ] Frontend server
  - [ ] Celery (if using)

- [ ] **Monitor Logs**
  - [ ] Check for errors
  - [ ] Verify location detection logs
  - [ ] Verify filtering logs

### Post-Deployment

- [ ] **Smoke Tests**
  - [ ] Create test post with image
  - [ ] Request test word filter
  - [ ] Admin approves filter
  - [ ] Test comment filtering

- [ ] **Monitor Performance**
  - [ ] Check API response times
  - [ ] Monitor database queries
  - [ ] Check memory usage

- [ ] **User Feedback**
  - [ ] Gather initial feedback
  - [ ] Address any issues
  - [ ] Document common questions

---

## 🚨 Rollback Plan

If issues occur:

1. **Revert Migrations**
   ```bash
   python manage.py migrate posts 0011  # Previous migration
   ```

2. **Remove Frontend Components**
   - Comment out component imports
   - Remove routes

3. **Restore Previous Code**
   - Use git to revert changes
   - Redeploy previous version

---

## 📊 Success Metrics

After deployment, verify:

- [ ] At least 1 location detected successfully
- [ ] At least 1 word filter request processed
- [ ] No errors in logs
- [ ] API response times < 500ms
- [ ] User feedback positive

---

## 🎯 Next Steps After Deployment

1. **Monitor Usage**
   - Track location detection success rate
   - Track word filter requests
   - Monitor filtered comments count

2. **Optimize**
   - Tune confidence threshold if needed
   - Add more word variations
   - Improve UI based on feedback

3. **Enhance**
   - Add location-based post discovery
   - Implement ML-based word detection
   - Create analytics dashboard

---

## ✅ Deployment Complete!

Once all items are checked:

- [ ] Mark deployment as complete
- [ ] Update changelog
- [ ] Notify team/users
- [ ] Celebrate! 🎉

---

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Version**: 1.0.0  
**Status**: _______________
