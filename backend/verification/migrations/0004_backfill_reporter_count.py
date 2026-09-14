"""Fill in reporter_count for rumours recorded before the column existed.

Counted from the session key, since none of these conversations carry a
visitor key: it is the same fallback the engine uses.

Deliberately does NOT publish anything it finds above the threshold. A rumour
becoming a public article is an outward-facing act, and a migration is the
wrong place for one: nobody is watching, and the first anyone would know is
when the article appeared. Existing rumours publish the next time somebody
raises them, which is when a person is present to see it happen.
"""

from django.db import migrations


def backfill(apps, schema_editor):
    Rumour = apps.get_model("verification", "Rumour")
    for rumour in Rumour.objects.all().iterator():
        keys = rumour.mentions.values_list(
            "claim__conversation__visitor_key", "claim__conversation__session_key"
        )
        rumour.reporter_count = len({visitor or f"session:{session}" for visitor, session in keys})
        rumour.save(update_fields=["reporter_count"])


class Migration(migrations.Migration):
    dependencies = [("verification", "0003_conversation_visitor_key_rumour_reporter_count_and_more")]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
