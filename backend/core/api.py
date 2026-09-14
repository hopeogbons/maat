"""Read-only reference data the front end needs to fill in a form.

Countries and time zones are a catalogue, not a secret, and a form cannot offer
a choice it cannot name. They are open to anyone signed in, cached hard, and
carry only the fields a select needs.
"""

from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Country, TimeZone

#: The catalogue changes when ISO does, which is once or twice a year.
CACHE_SECONDS = 60 * 60 * 24


@method_decorator(cache_page(CACHE_SECONDS), name="dispatch")
class ReferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(
            {
                "countries": [
                    {"id": str(c.id), "name": c.name, "iso2": c.iso2, "flag": c.flag_emoji}
                    for c in Country.active.order_by("name")
                ],
                "timezones": [
                    {"id": str(t.id), "name": t.name} for t in TimeZone.active.order_by("name")
                ],
            }
        )
