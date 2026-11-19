"""Tests for inject display order."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from exercises.models import Event, Exercise, Inject
from exercises.router import reorder_injects
from exercises.schemas import InjectOrderSchema


class InjectOrderTests(TestCase):
    def test_reorder_persists_and_visibility_does_not_change_order(self):
        user = get_user_model().objects.create_user(username="facilitator")
        now = timezone.now()
        exercise = Exercise.objects.create(
            created_by=user, updated_by=user, scheduled_start_time=now,
            scheduled_end_time=now, title="Exercise", scenario="Scenario",
        )
        event = Event.objects.create(exercise=exercise, number=1, description="Event")
        injects = [
            Inject.objects.create(
                event=event, number=str(number), position=number - 1,
                scheduled_start_time=now, delivery_method=Inject.DeliveryMethod.EMAIL,
                sender=Inject.Role.ISO, recipient=Inject.Role.ISSO, message="Message",
            )
            for number in (1, 2, 3)
        ]
        desired = [injects[2].id, injects[0].id, injects[1].id]
        result = reorder_injects(None, exercise.id, event.id, InjectOrderSchema(inject_ids=desired))
        self.assertEqual(result.status_code, 204)
        injects[0].is_visible = True
        injects[0].save(update_fields=["is_visible"])
        self.assertEqual(list(event.injects.values_list("id", flat=True)), desired)

        invalid = reorder_injects(None, exercise.id, event.id, InjectOrderSchema(inject_ids=[desired[0]] * 3))
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(list(event.injects.values_list("id", flat=True)), desired)
