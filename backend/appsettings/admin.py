from django.contrib import admin

from appsettings.models import AppSetting


@admin.register(AppSetting)
class AppSettingAdmin(admin.ModelAdmin):
    """One row, so adding another is refused rather than silently merged."""

    list_display = ("__str__", "confidence_gate", "mentions_before_publish", "updated_at")
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")

    def has_add_permission(self, request):
        return not AppSetting.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
