from django.db import migrations, models


def preserve_visibility(apps, schema_editor):
    inject = apps.get_model("exercises", "Inject")
    inject.objects.filter(started_at__isnull=False).update(is_visible=True)


class Migration(migrations.Migration):
    dependencies = [("exercises", "0009_chatmessage")]

    operations = [
        migrations.AddField(
            model_name="inject",
            name="is_visible",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(preserve_visibility, migrations.RunPython.noop),
    ]
