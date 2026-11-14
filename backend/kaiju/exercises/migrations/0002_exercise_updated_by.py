import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def copy_creator_to_updater(apps, schema_editor):
    exercise_model = apps.get_model("exercises", "Exercise")
    exercise_model.objects.update(updated_by_id=models.F("created_by_id"))


class Migration(migrations.Migration):
    dependencies = [
        ("exercises", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="exercise",
            name="updated_by",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="exercises_updated",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(copy_creator_to_updater, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="exercise",
            name="updated_by",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="exercises_updated",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
