"""Read-only reference data the front end needs to fill in a form.

Countries and time zones are a catalogue, not a secret, and a form cannot offer
a choice it cannot name. They are open to anyone signed in and carry only the
fields a select needs.

Not cached. It used to be, for a day, and that made the profile page lie: a
catalogue seeded after the first request stayed invisible until the cache
expired, and a reset that emptied it kept serving the old rows. Seven hundred
rows from an indexed table is cheaper than explaining that.
"""

from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Country, TimeZone

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
