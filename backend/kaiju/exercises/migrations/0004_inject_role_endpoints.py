from django.db import migrations, models


INJECT_ROLE_CHOICES = [
    ("information_system_owner", "Iso"),
    ("information_system_security_manager", "Issm"),
    ("information_system_security_officer", "Isso"),
    ("system_administrator", "System Administrator"),
    ("user", "User"),
    ("cybersecurity_service_provider", "Cssp"),
    ("opposing_force", "Opfor"),
]

LEGACY_SENDER_ROLES = {
    "cssp": "cybersecurity_service_provider",
    "cybersecurity service provider": "cybersecurity_service_provider",
    "cybersecurity_service_provider": "cybersecurity_service_provider",
    "information system owner": "information_system_owner",
    "information system security manager": "information_system_security_manager",
    "information system security officer": "information_system_security_officer",
    "information_system_owner": "information_system_owner",
    "information_system_security_manager": "information_system_security_manager",
    "information_system_security_officer": "information_system_security_officer",
    "iso": "information_system_owner",
    "issm": "information_system_security_manager",
    "isso": "information_system_security_officer",
    "opfor": "opposing_force",
    "opposing force": "opposing_force",
    "opposing_force": "opposing_force",
    "system administrator": "system_administrator",
    "system_administrator": "system_administrator",
    "user": "user",
}


def set_inject_roles(apps, schema_editor):
    Inject = apps.get_model("exercises", "Inject")

    for inject in Inject.objects.select_related("recipient").all():
        try:
            sender = LEGACY_SENDER_ROLES[inject.sender.strip().lower()]
        except KeyError as error:
            raise ValueError(
                f"Inject {inject.id} has unsupported sender role {inject.sender!r}."
            ) from error

        recipient = inject.recipient.role
        supported_roles = {value for value, _label in INJECT_ROLE_CHOICES}
        if recipient not in supported_roles:
            raise ValueError(
                f"Inject {inject.id} has unsupported recipient role {recipient!r}."
            )

        inject.sender = sender
        inject.recipient_role = recipient
        inject.save(update_fields=["sender", "recipient_role"])


class Migration(migrations.Migration):
    dependencies = [
        ("exercises", "0003_alter_inject_recipient"),
    ]

    operations = [
        migrations.AddField(
            model_name="inject",
            name="recipient_role",
            field=models.CharField(
                choices=INJECT_ROLE_CHOICES,
                max_length=40,
                null=True,
            ),
        ),
        migrations.RunPython(set_inject_roles, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="inject",
            name="recipient",
        ),
        migrations.RenameField(
            model_name="inject",
            old_name="recipient_role",
            new_name="recipient",
        ),
        migrations.AlterField(
            model_name="inject",
            name="recipient",
            field=models.CharField(choices=INJECT_ROLE_CHOICES, max_length=40),
        ),
        migrations.AlterField(
            model_name="inject",
            name="sender",
            field=models.CharField(choices=INJECT_ROLE_CHOICES, max_length=40),
        ),
    ]
