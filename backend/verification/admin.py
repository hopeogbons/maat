from django.contrib import admin

from verification.models import (
    Article,
    Claim,
    Conversation,
    Evidence,
    LiveLookup,
    Mention,
    Rumour,
    Tag,
    Turn,
)


class TurnInline(admin.TabularInline):
    model = Turn
    extra = 0
    fields = ("speaker", "paraphrase", "intent", "is_manipulation", "degraded", "created_at")
    readonly_fields = fields
    can_delete = False
    max_num = 0


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("__str__", "language", "created_at", "last_active_at", "is_closed")
    list_filter = ("is_closed", "language")
    inlines = [TurnInline]


@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    list_display = ("__str__", "who", "when_text", "where", "when_unknown", "created_at")
    list_filter = ("when_unknown", "where")
    search_fields = ("paraphrase", "who", "what")


class EvidenceInline(admin.TabularInline):
    model = Evidence
    extra = 0
    fields = ("chunk", "judgement", "score", "retrieval_score", "quote")
    readonly_fields = fields
    can_delete = False
    max_num = 0


class MentionInline(admin.TabularInline):
    model = Mention
    extra = 0
    fields = ("claim", "verdict", "confidence", "match_score", "created_at")
    readonly_fields = fields
    can_delete = False
    max_num = 0


@admin.register(Rumour)
class RumourAdmin(admin.ModelAdmin):
    list_display = ("__str__", "verdict", "confidence", "mention_count", "status", "last_seen_at")
    list_filter = ("verdict", "status", "country")
    search_fields = ("statement",)
    prepopulated_fields = {"slug": ("statement",)}
    inlines = [MentionInline, EvidenceInline]


@admin.register(LiveLookup)
class LiveLookupAdmin(admin.ModelAdmin):
    list_display = ("__str__", "consented", "found_anything", "asked_at")
    list_filter = ("consented", "found_anything")
    filter_horizontal = ("sources",)


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "verdict", "published_at", "read_minutes")
    list_filter = ("verdict", "tags")
    search_fields = ("title", "summary", "body")
    prepopulated_fields = {"slug": ("title",)}
    filter_horizontal = ("tags",)
    date_hierarchy = "published_at"


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
