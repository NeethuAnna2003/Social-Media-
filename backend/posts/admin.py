from django.contrib import admin
from .models import Post, Like, Comment, PostMedia

class PostMediaInline(admin.TabularInline):
    model = PostMedia
    extra = 1

class PostAdmin(admin.ModelAdmin):
    inlines = [PostMediaInline]
    list_display = ('id', 'user', 'created_at', 'ai_status')
    list_filter = ('ai_status', 'created_at')
    search_fields = ('user__username', 'text')

admin.site.register(Post, PostAdmin)
admin.site.register(Comment)
admin.site.register(Like)
admin.site.register(PostMedia)
