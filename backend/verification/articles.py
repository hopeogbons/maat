"""The public reading of published articles. No sign-in: this is the site.

Only articles with a publication date are served, and only their own words:
an article is the public face of a rumour, so nothing about who raised it,
how often, or from where leaves this endpoint.
"""

from __future__ import annotations

from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ai.story import TOPICS

from .models import Article

#: The landing page shows a grid, not an archive.
PAGE_SIZE = 24


def _payload(article: Article) -> dict:
    source = _first_source(article)
    return {
        "slug": article.slug,
        "title": article.title,
        "verdict": article.verdict,
        "summary": article.summary,
        "body": article.body,
        "tags": [tag.name for tag in article.tags.all()],
        "source": source,
        "published": article.published_at.date().isoformat() if article.published_at else "",
        "readMinutes": article.read_minutes,
    }


def _first_source(article: Article) -> dict | None:
    """The body whose document carried the most weight, for the card's footer.

    Absent when nothing was cited, which is exactly the case the landing page
    already draws as "no verified source found".
    """
    evidence = (
        article.rumour.evidence.select_related("chunk__document__source").order_by("-score").first()
    )
    if evidence is None:
        return None
    document = evidence.chunk.document
    if not document.source_id:
        return None
    return {
        "issuer": document.source.name,
        "date": document.published_at.isoformat() if document.published_at else "",
    }


class ArticlesView(APIView):
    """Published verifications, newest first, with the topics to filter by.

    The tag list is the vocabulary that is actually in use, not every topic
    Ma'at knows: a filter chip that returns nothing is a broken promise.
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request: Request) -> Response:
        articles = (
            Article.active.filter(published_at__isnull=False)
            .select_related("rumour")
            .prefetch_related("tags")
            .order_by("-published_at")[:PAGE_SIZE]
        )
        payload = [_payload(article) for article in articles]
        used = {tag for article in payload for tag in article["tags"]}
        return Response({"articles": payload, "tags": [t for t in TOPICS if t in used]})
