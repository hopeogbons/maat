from django.db import connection
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request: Request) -> Response:
    """Liveness check used by the frontend and by uptime monitors.

    Also touches the database so a broken DATABASE_URL shows up here
    instead of on the first real request.
    """
    database = "ok"
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception as exc:  # noqa: BLE001 - report any DB failure
        database = f"error: {exc.__class__.__name__}"

    payload = {
        "status": "ok" if database == "ok" else "degraded",
        "service": "maat-api",
        "database": database,
        "time": timezone.now().isoformat(),
    }
    http_status = status.HTTP_200_OK if database == "ok" else status.HTTP_503_SERVICE_UNAVAILABLE
    return Response(payload, status=http_status)
