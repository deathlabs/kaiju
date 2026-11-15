import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("exercises", "0002_exercise_updated_by"),
    ]

    operations = [
        migrations.AlterField(
            model_name="inject",
            name="recipient",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="injects_received",
                to="exercises.participant",
            ),
        ),
    ]
