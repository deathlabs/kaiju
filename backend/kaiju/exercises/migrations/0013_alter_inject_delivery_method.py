from django.db import migrations, models


def migrate_legacy_delivery_methods(apps, schema_editor):
    """Convert removed delivery methods to voicemail."""
    inject_model = apps.get_model("exercises", "Inject")
    inject_model.objects.filter(
        delivery_method__in=("index_card", "phone_call"),
    ).update(delivery_method="voicemail")


class Migration(migrations.Migration):

    dependencies = [
        ("exercises", "0012_alter_inject_options_inject_position"),
    ]

    operations = [
        migrations.RunPython(
            migrate_legacy_delivery_methods,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="inject",
            name="delivery_method",
            field=models.CharField(
                choices=[
                    ("voicemail", "Voicemail"),
                    ("email", "Email"),
                    ("chat_message", "Chat Message"),
                ],
                max_length=20,
            ),
        ),
    ]
