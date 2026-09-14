from django.contrib import admin

from accounts.models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("display_name", "user", "job_title", "phone", "country")
    search_fields = ("first_name", "last_name", "user__username", "phone")
    list_filter = ("country",)
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")
