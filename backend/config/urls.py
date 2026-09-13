from django.conf import settings
from django.contrib import admin
from django.urls import include, path

# The admin wears the Ma’at name; templates/admin/base_site.html wears its colours.
admin.site.site_header = "Ma’at administration"
admin.site.site_title = "Ma’at admin"
admin.site.index_title = "Weighing rumours against the record"
# "View site" belongs on the public site, not on Django's own root.
admin.site.site_url = settings.FRONTEND_URL or "/"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("accounts.urls")),
    path("api/", include("api.urls")),
]
