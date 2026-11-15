from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("references", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="reference",
            name="type",
            field=models.CharField(
                choices=[
                    ("policy", "Policy"),
                    ("standard", "Standard"),
                    ("procedure", "Procedure"),
                    ("guideline", "Guideline"),
                ],
                default="guideline",
                max_length=20,
            ),
            preserve_default=False,
        ),
    ]
