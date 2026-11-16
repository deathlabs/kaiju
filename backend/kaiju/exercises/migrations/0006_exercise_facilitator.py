from django.db import migrations, models
import django.db.models.deletion


def assign_facilitators(apps, schema_editor):
    Exercise = apps.get_model("exercises", "Exercise")
    Participant = apps.get_model("exercises", "Participant")
    for exercise in Exercise.objects.select_related("created_by").all():
        participant = Participant.objects.filter(
            exercise=exercise, role="facilitator"
        ).order_by("created_at", "id").first()
        if participant is None:
            creator = exercise.created_by
            participant = Participant.objects.filter(
                exercise=exercise, email=creator.email
            ).first() if creator.email else None
            if participant is None:
                participant = Participant.objects.create(
                    exercise=exercise,
                    first_name=creator.first_name,
                    last_name=creator.last_name,
                    email=creator.email or None,
                    role="facilitator",
                )
            else:
                participant.role = "facilitator"
                participant.save(update_fields=["role"])
        exercise.facilitator_id = participant.id
        exercise.save(update_fields=["facilitator"])


class Migration(migrations.Migration):
    dependencies = [("exercises", "0005_event_position")]

    operations = [
        migrations.AddField(
            model_name="exercise",
            name="facilitator",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="facilitated_exercises",
                to="exercises.participant",
            ),
        ),
        migrations.RunPython(assign_facilitators, migrations.RunPython.noop),
    ]
