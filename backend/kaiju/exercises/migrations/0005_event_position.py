from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("exercises", "0004_inject_role_endpoints")]

    operations = [
        migrations.AddField(
            model_name="event",
            name="position",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterModelOptions(
            name="event",
            options={"ordering": ["position", "number"]},
        ),
    ]
