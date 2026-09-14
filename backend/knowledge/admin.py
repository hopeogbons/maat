from django.contrib import admin

from knowledge.models import Chunk, Document, IngestionRun, Source


@admin.register(Source)
class SourceAdmin(admin.ModelAdmin):
    list_display = ("name", "door", "scope", "is_active", "cadence_minutes", "last_polled_at")
    list_filter = ("door", "is_active", "country")
    search_fields = ("name", "address", "homepage")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("last_polled_at", "created_at", "updated_at", "created_by", "updated_by")


class ChunkInline(admin.TabularInline):
    model = Chunk
    extra = 0
    fields = ("kind", "chunk_index", "page_number", "text")
    readonly_fields = fields
    can_delete = False
    max_num = 0


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "source", "version", "is_current", "published_at", "fetched_at")
    list_filter = ("source", "is_current", "country", "language")
    search_fields = ("title", "identifier", "url")
    date_hierarchy = "published_at"
    inlines = [ChunkInline]
    readonly_fields = ("fingerprint", "byte_size", "parser_version", "created_at", "updated_at")


@admin.register(IngestionRun)
class IngestionRunAdmin(admin.ModelAdmin):
    list_display = (
        "source",
        "status",
        "started_at",
        "finished_at",
        "documents_seen",
        "documents_added",
        "chunks_written",
    )
    list_filter = ("status", "source")
    readonly_fields = [field.name for field in IngestionRun._meta.fields]
