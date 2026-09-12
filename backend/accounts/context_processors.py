from django.conf import settings
from django.http import HttpRequest


def site(request: HttpRequest) -> dict[str, str]:
    """Expose the public site URL so every page can link back to the landing page."""
    return {"FRONTEND_URL": settings.FRONTEND_URL}
