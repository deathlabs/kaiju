# Standard library imports.
from uuid import UUID

# Third party imports.
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Max, QuerySet
from django.utils import timezone
from ninja import Router, Status

# Local imports.
from exercises.models import (
    Event,
    Exercise,
    Finding,
    Inject,
    Participant,
    Response,
)
from exercises.schemas import (
    AfterActionReportSchema,
    BadRequestResponseSchema,
    CardReplyCreateSchema,
    EventCreateSchema,
    EventOrderSchema,
    EventSchema,
    EventUpdateSchema,
    ExerciseCreateSchema,
    ExerciseListSchema,
    ExerciseSchema,
    ExerciseUpdateSchema,
    FindingCreateSchema,
    FindingSchema,
    FindingUpdateSchema,
    InjectCreateSchema,
    InjectSchema,
    InjectUpdateSchema,
    NotFoundResponseSchema,
    ParticipantCreateSchema,
    ParticipantSchema,
    ParticipantUpdateSchema,
    ResponseCreateSchema,
    ResponseSchema,
)
from objectives.models import Objective
from references.models import Reference

# Init the exercises router.
exercises_router = Router(tags=["exercises"])


def _get_objectives(
    objective_ids: list[UUID],
    allowed_objectives: QuerySet[Objective],
) -> tuple[list[Objective], list[UUID]]:
    """Get the allowed objectives and the IDs that are not allowed."""
    unique_ids = list(dict.fromkeys(objective_ids))
    objectives = list(allowed_objectives.filter(id__in=unique_ids))
    found_ids = {objective.id for objective in objectives}
    invalid_ids = [
        objective_id for objective_id in unique_ids if objective_id not in found_ids
    ]
    return objectives, invalid_ids


def _get_references(
    reference_ids: list[UUID],
    allowed_references: QuerySet[Reference],
) -> tuple[list[Reference], list[UUID]]:
    """Get the allowed references and the IDs that are not allowed."""
    unique_ids = list(dict.fromkeys(reference_ids))
    references = list(allowed_references.filter(id__in=unique_ids))
    found_ids = {reference.id for reference in references}
    invalid_ids = [
        reference_id for reference_id in unique_ids if reference_id not in found_ids
    ]
    return references, invalid_ids


def _invalid_objectives_message(invalid_ids: list[UUID]) -> str:
    """Return an error message for objective IDs that are not allowed."""
    objective_ids = ", ".join(str(objective_id) for objective_id in invalid_ids)
    return f"Invalid objective IDs: {objective_ids}"


def _invalid_references_message(invalid_ids: list[UUID]) -> str:
    """Return an error message for reference IDs that are not allowed."""
    reference_ids = ", ".join(str(reference_id) for reference_id in invalid_ids)
    return f"Invalid reference IDs: {reference_ids}"


@exercises_router.post(
    "/",
    response={
        201: ExerciseSchema,
        400: BadRequestResponseSchema,
    },
)
@transaction.atomic
def create_exercise(request, payload: ExerciseCreateSchema):
    """Create an exercise."""
    data = payload.model_dump()
    new_objective_data = data.pop("new_objectives")
    new_reference_data = data.pop("new_references")
    objective_ids = data.pop("objective_ids")
    reference_ids = data.pop("reference_ids")
    facilitator_username = data.pop("facilitator_username")
    facilitator = request.user
    if facilitator_username:
        try:
            facilitator = get_user_model().objects.get(username=facilitator_username)
        except get_user_model().DoesNotExist:
            return Status(400, {"message": "The selected facilitator does not exist"})

    objectives, invalid_ids = _get_objectives(
        objective_ids,
        Objective.objects.all(),
    )
    if invalid_ids:
        return Status(400, {"message": _invalid_objectives_message(invalid_ids)})

    references, invalid_ids = _get_references(
        reference_ids,
        Reference.objects.all(),
    )
    if invalid_ids:
        return Status(400, {"message": _invalid_references_message(invalid_ids)})

    objectives.extend(
        Objective.objects.create(**objective_data)
        for objective_data in new_objective_data
    )
    references.extend(
        Reference.objects.create(**reference_data)
        for reference_data in new_reference_data
    )

    exercise = Exercise.objects.create(
        created_by=request.user,
        updated_by=request.user,
        **data,
    )
    exercise.objectives.set(objectives)
    exercise.references.set(references)

    participant = Participant.objects.create(
        exercise=exercise,
        first_name=facilitator.first_name,
        last_name=facilitator.last_name,
        email=facilitator.email or None,
        role=Participant.Role.FACILITATOR,
    )

    exercise.facilitator = participant
    exercise.save(update_fields=["facilitator"])

    return Status(201, exercise)


@exercises_router.get("/", response={200: list[ExerciseListSchema]})
def list_exercises(request):
    """Fetch all exercises."""
    return Status(
        200,
        Exercise.objects.select_related("created_by", "updated_by").prefetch_related(
            "objectives",
            "participants",
            "references",
        ),
    )


@exercises_router.get(
    "/{exercise_id}/",
    response={
        200: ExerciseSchema,
        404: NotFoundResponseSchema,
    },
)
def get_exercise(request, exercise_id: UUID):
    """Fetch an exercise."""
    try:
        return Status(
            200,
            Exercise.objects.select_related("created_by", "updated_by").get(
                id=exercise_id,
            ),
        )
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})


@exercises_router.patch(
    "/{exercise_id}/",
    response={
        200: ExerciseSchema,
        400: BadRequestResponseSchema,
        404: NotFoundResponseSchema,
    },
)
@transaction.atomic
def update_exercise(request, exercise_id: UUID, payload: ExerciseUpdateSchema):
    """Update an exercise."""
    try:
        exercise = Exercise.objects.select_for_update().get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})

    data = payload.model_dump(exclude_unset=True)

    new_objective_data = data.pop("new_objectives", None)
    new_reference_data = data.pop("new_references", None)
    reference_ids = data.pop("reference_ids", None)
    objective_ids = data.pop("objective_ids", None)
    facilitator_username = data.pop("facilitator_username", None)
    facilitator_id = data.pop("facilitator_id", None)
    assistant_ids = data.pop("assistant_facilitator_ids", None)
    if "facilitator_id" in payload.model_fields_set and facilitator_id is None:
        return Status(400, {"message": "An exercise must have a facilitator"})
    if facilitator_username is not None and assistant_ids is not None:
        return Status(400, {"message": "Use facilitator IDs when setting assistants"})
    if facilitator_id is not None and facilitator_username is not None:
        return Status(400, {"message": "Select a facilitator using one identifier"})
    if assistant_ids is not None:
        if len(assistant_ids) != len(set(assistant_ids)):
            return Status(400, {"message": "Assistant facilitator IDs must be unique"})
        if (facilitator_id or exercise.facilitator_id) in assistant_ids:
            return Status(400, {"message": "The facilitator cannot also be an assistant"})
    selected_ids = set(assistant_ids or [])
    if facilitator_id is not None:
        selected_ids.add(facilitator_id)
    participants = {participant.id: participant for participant in exercise.participants.filter(id__in=selected_ids)}
    if len(participants) != len(selected_ids):
        return Status(400, {"message": "Facilitators must belong to the exercise"})
    if facilitator_id is not None and participants[facilitator_id].role != Participant.Role.FACILITATOR:
        return Status(400, {"message": "The selected participant must be a facilitator"})
    if assistant_ids is not None and any(participants[item].role != Participant.Role.FACILITATOR for item in assistant_ids):
        return Status(400, {"message": "Assistant facilitators must have the facilitator role"})

    facilitator = None
    if facilitator_username is not None:
        try:
            facilitator = get_user_model().objects.get(username=facilitator_username)
        except get_user_model().DoesNotExist:
            return Status(400, {"message": "The selected facilitator does not exist"})

    objectives = None
    if objective_ids is not None:
        objectives, invalid_ids = _get_objectives(
            objective_ids,
            Objective.objects.all(),
        )
        if invalid_ids:
            return Status(400, {"message": _invalid_objectives_message(invalid_ids)})

        objective_id_set = {objective.id for objective in objectives}
        event_objective_ids = set(
            Objective.objects.filter(events__exercise=exercise).values_list(
                "id",
                flat=True,
            )
        )
        removed_event_objective_ids = event_objective_ids - objective_id_set
        if removed_event_objective_ids:
            objective_id_list = ", ".join(
                str(objective_id)
                for objective_id in sorted(removed_event_objective_ids)
            )
            return Status(
                400,
                {
                    "message": (
                        "Objectives used by events must remain attached to the "
                        f"exercise: {objective_id_list}"
                    )
                },
            )

    references = None
    if reference_ids is not None:
        references, invalid_ids = _get_references(
            reference_ids,
            Reference.objects.all(),
        )
        if invalid_ids:
            return Status(400, {"message": _invalid_references_message(invalid_ids)})

    if new_objective_data:
        if objectives is None:
            objectives = list(exercise.objectives.all())
        objectives.extend(
            Objective.objects.create(**objective_data)
            for objective_data in new_objective_data
        )

    if new_reference_data:
        if references is None:
            references = list(exercise.references.all())
        references.extend(
            Reference.objects.create(**reference_data)
            for reference_data in new_reference_data
        )

    if facilitator_id is not None:
        exercise.facilitator_id = facilitator_id

    for field, value in data.items():
        setattr(exercise, field, value)

    exercise.updated_by = request.user
    exercise.save()

    if objective_ids is not None or new_objective_data:
        exercise.objectives.set(objectives)

    if reference_ids is not None or new_reference_data:
        exercise.references.set(references)

    if facilitator is not None:
        selected_participant = exercise.participants.filter(email=facilitator.email).first() if facilitator.email else None
        if selected_participant is None:
            selected_participant = Participant(exercise=exercise)
        selected_participant.first_name = facilitator.first_name
        selected_participant.last_name = facilitator.last_name
        selected_participant.email = facilitator.email or None
        selected_participant.role = Participant.Role.FACILITATOR
        selected_participant.save()
        exercise.facilitator = selected_participant
        exercise.save(update_fields=["facilitator"])

    if assistant_ids is not None:
        exercise.participants.filter(role=Participant.Role.FACILITATOR).exclude(
            id__in=[exercise.facilitator_id, *assistant_ids]
        ).update(role=Participant.Role.USER)

    return Status(200, exercise)


@exercises_router.delete(
    "/{exercise_id}/",
    response={
        204: None,
        404: NotFoundResponseSchema,
    },
)
def delete_exercise(request, exercise_id: UUID):
    """Delete an exercise."""
    try:
        exercise = Exercise.objects.get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})

    exercise.delete()

    return Status(204, None)


@exercises_router.post(
    "/{exercise_id}/participants/",
    response={
        201: ParticipantSchema,
        404: NotFoundResponseSchema,
    },
)
def create_participant(request, exercise_id: UUID, payload: ParticipantCreateSchema):
    """Create a participant."""
    try:
        exercise = Exercise.objects.get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})

    participant = Participant.objects.create(
        exercise=exercise,
        **payload.model_dump(),
    )

    return Status(201, participant)


@exercises_router.get(
    "/{exercise_id}/participants/",
    response={
        200: list[ParticipantSchema],
        404: NotFoundResponseSchema,
    },
)
def list_participants(request, exercise_id: UUID):
    """Fetch all participants."""
    try:
        exercise = Exercise.objects.get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})

    return Status(
        200,
        Participant.objects.filter(exercise=exercise),
    )


@exercises_router.get(
    "/{exercise_id}/participants/{participant_id}/",
    response={
        200: ParticipantSchema,
        404: NotFoundResponseSchema,
    },
)
def get_participant(request, exercise_id: UUID, participant_id: UUID):
    """Fetch a participant by its ID."""
    try:
        participant = Participant.objects.get(
            id=participant_id,
            exercise_id=exercise_id,
        )
    except Participant.DoesNotExist:
        return Status(404, {"message": "Participant not found"})

    return Status(200, participant)


@exercises_router.patch(
    "/{exercise_id}/participants/{participant_id}/",
    response={
        200: ParticipantSchema,
        400: BadRequestResponseSchema,
        404: NotFoundResponseSchema,
    },
)
@transaction.atomic
def update_participant(
    request,
    exercise_id: UUID,
    participant_id: UUID,
    payload: ParticipantUpdateSchema,
):
    """Update a participant."""
    Exercise.objects.select_for_update().filter(id=exercise_id).first()
    try:
        participant = Participant.objects.get(
            id=participant_id,
            exercise_id=exercise_id,
        )
    except Participant.DoesNotExist:
        return Status(404, {"message": "Participant not found"})

    data = payload.model_dump(exclude_unset=True)
    new_role = data.get("role")

    if participant.id == participant.exercise.facilitator_id and new_role is not None and new_role != Participant.Role.FACILITATOR:
        return Status(400, {"message": "Assign a replacement facilitator first"})

    if (
        participant.role == Participant.Role.FACILITATOR
        and new_role is not None
        and new_role != Participant.Role.FACILITATOR
    ):
        facilitator_count = Participant.objects.filter(
            exercise_id=exercise_id,
            role=Participant.Role.FACILITATOR,
        ).count()

        if facilitator_count == 1:
            return Status(
                400,
                {"message": "An exercise must have at least one facilitator"},
            )

    for field, value in data.items():
        setattr(participant, field, value)

    participant.save()

    return Status(200, participant)


@exercises_router.delete(
    "/{exercise_id}/participants/{participant_id}/",
    response={
        204: None,
        400: BadRequestResponseSchema,
        404: NotFoundResponseSchema,
    },
)
@transaction.atomic
def delete_participant(request, exercise_id: UUID, participant_id: UUID):
    """Delete a participant."""
    Exercise.objects.select_for_update().filter(id=exercise_id).first()
    try:
        participant = Participant.objects.get(
            id=participant_id,
            exercise_id=exercise_id,
        )
    except Participant.DoesNotExist:
        return Status(404, {"message": "Participant not found"})

    if participant.id == participant.exercise.facilitator_id:
        return Status(400, {"message": "Assign a replacement facilitator first"})

    if participant.role == Participant.Role.FACILITATOR:
        facilitator_count = Participant.objects.filter(
            exercise_id=exercise_id,
            role=Participant.Role.FACILITATOR,
        ).count()

        if facilitator_count == 1:
            return Status(
                400,
                {"message": "An exercise must have at least one facilitator"},
            )

    participant.delete()

    return Status(204, None)


def _valid_new_inject_numbers(new_injects: list[dict], existing_numbers: set[str]) -> bool:
    """Check that new inject numbers are valid and unique."""
    numbers = [inject["number"] for inject in new_injects]
    return (
        all(number.strip() and len(number) <= 10 for number in numbers)
        and len(numbers) == len(set(numbers))
        and not existing_numbers.intersection(numbers)
    )


@exercises_router.post(
    "/{exercise_id}/events/",
    response={
        201: EventSchema,
        400: BadRequestResponseSchema,
        404: NotFoundResponseSchema,
    },
)
@transaction.atomic
def create_event(request, exercise_id: UUID, payload: EventCreateSchema):
    """Create an event."""
    try:
        exercise = Exercise.objects.get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})

    data = payload.model_dump()
    new_objective_data = data.pop("new_objectives")
    new_inject_data = data.pop("new_injects")
    objective_ids = data.pop("objective_ids")
    if not _valid_new_inject_numbers(new_inject_data, set()):
        return Status(400, {"message": "Inject numbers must be unique and contain 1 to 10 characters"})
    objectives, invalid_ids = _get_objectives(
        objective_ids,
        exercise.objectives.all(),
    )
    if invalid_ids:
        return Status(400, {"message": _invalid_objectives_message(invalid_ids)})

    new_objectives = [
        Objective.objects.create(**objective_data)
        for objective_data in new_objective_data
    ]
    exercise.objectives.add(*new_objectives)
    objectives.extend(new_objectives)

    position = Event.objects.filter(exercise=exercise).aggregate(
        max_position=Max("position")
    )["max_position"]
    event = Event.objects.create(
        exercise=exercise,
        position=0 if position is None else position + 1,
        **data,
    )

    event.objectives.set(objectives)
    Inject.objects.bulk_create([Inject(event=event, **inject) for inject in new_inject_data])

    return Status(201, event)


@exercises_router.get(
    "/{exercise_id}/events/",
    response={
        200: list[EventSchema],
        404: NotFoundResponseSchema,
    },
)
def list_events(request, exercise_id: UUID):
    """Fetch all events."""
    try:
        exercise = Exercise.objects.get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})

    return Status(
        200,
        Event.objects.filter(exercise=exercise),
    )


@exercises_router.put(
    "/{exercise_id}/events/order/",
    response={204: None, 400: BadRequestResponseSchema, 404: NotFoundResponseSchema},
)
@transaction.atomic
def reorder_events(request, exercise_id: UUID, payload: EventOrderSchema):
    """Set the display order of all events in an exercise."""
    try:
        exercise = Exercise.objects.select_for_update().get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})

    events = list(Event.objects.filter(exercise=exercise))
    events_by_id = {event.id: event for event in events}
    if len(payload.event_ids) != len(events) or set(payload.event_ids) != set(events_by_id):
        return Status(400, {"message": "Provide each event in the exercise once"})

    for position, event_id in enumerate(payload.event_ids):
        events_by_id[event_id].position = position
    Event.objects.bulk_update(events, ["position"])
    return Status(204, None)


@exercises_router.get(
    "/{exercise_id}/events/{event_id}/",
    response={
        200: EventSchema,
        404: NotFoundResponseSchema,
    },
)
def get_event(request, exercise_id: UUID, event_id: UUID):
    """Fetch an event."""
    try:
        event = Event.objects.get(
            id=event_id,
            exercise_id=exercise_id,
        )
    except Event.DoesNotExist:
        return Status(404, {"message": "Event not found"})

    return Status(200, event)


@exercises_router.patch(
    "/{exercise_id}/events/{event_id}/",
    response={
        200: EventSchema,
        400: BadRequestResponseSchema,
        404: NotFoundResponseSchema,
    },
)
@transaction.atomic
def update_event(
    request,
    exercise_id: UUID,
    event_id: UUID,
    payload: EventUpdateSchema,
):
    """Update an event."""
    try:
        event = Event.objects.get(
            id=event_id,
            exercise_id=exercise_id,
        )
    except Event.DoesNotExist:
        return Status(404, {"message": "Event not found"})

    data = payload.model_dump(exclude_unset=True)

    new_objective_data = data.pop("new_objectives", None)
    new_inject_data = data.pop("new_injects", None) or []
    objective_ids = data.pop("objective_ids", None)
    existing_numbers = set(event.injects.values_list("number", flat=True))
    if not _valid_new_inject_numbers(new_inject_data, existing_numbers):
        return Status(400, {"message": "Inject numbers must be unique and contain 1 to 10 characters"})

    objectives = None
    if objective_ids is not None:
        objectives, invalid_ids = _get_objectives(
            objective_ids,
            event.exercise.objectives.all(),
        )
        if invalid_ids:
            return Status(400, {"message": _invalid_objectives_message(invalid_ids)})

    if new_objective_data:
        if objectives is None:
            objectives = list(event.objectives.all())
        new_objectives = [
            Objective.objects.create(**objective_data)
            for objective_data in new_objective_data
        ]
        event.exercise.objectives.add(*new_objectives)
        objectives.extend(new_objectives)

    for field, value in data.items():
        setattr(event, field, value)

    event.save()

    if objective_ids is not None or new_objective_data:
        event.objectives.set(objectives)
    Inject.objects.bulk_create([Inject(event=event, **inject) for inject in new_inject_data])

    return Status(200, event)


@exercises_router.delete(
    "/{exercise_id}/events/{event_id}/",
    response={
        204: None,
        404: NotFoundResponseSchema,
    },
)
def delete_event(request, exercise_id: UUID, event_id: UUID):
    """Delete an event."""
    try:
        event = Event.objects.get(
            id=event_id,
            exercise_id=exercise_id,
        )
    except Event.DoesNotExist:
        return Status(404, {"message": "Event not found"})

    event.delete()

    return Status(204, None)


@exercises_router.post(
    "/{exercise_id}/events/{event_id}/injects/",
    response={
        201: InjectSchema,
        404: NotFoundResponseSchema,
    },
)
def create_inject(
    request,
    exercise_id: UUID,
    event_id: UUID,
    payload: InjectCreateSchema,
):
    """Create an inject."""
    try:
        event = Event.objects.get(
            id=event_id,
            exercise_id=exercise_id,
        )
    except Event.DoesNotExist:
        return Status(404, {"message": "Event not found"})

    inject = Inject.objects.create(
        event=event,
        **payload.model_dump(),
    )

    return Status(201, inject)


@exercises_router.get(
    "/{exercise_id}/events/{event_id}/injects/",
    response={
        200: list[InjectSchema],
        404: NotFoundResponseSchema,
    },
)
def list_injects(request, exercise_id: UUID, event_id: UUID):
    """Fetch all injects."""
    try:
        event = Event.objects.get(
            id=event_id,
            exercise_id=exercise_id,
        )
    except Event.DoesNotExist:
        return Status(404, {"message": "Event not found"})

    return Status(
        200,
        Inject.objects.filter(event=event),
    )


@exercises_router.get(
    "/{exercise_id}/events/{event_id}/injects/{inject_id}/",
    response={
        200: InjectSchema,
        404: NotFoundResponseSchema,
    },
)
def get_inject(request, exercise_id: UUID, event_id: UUID, inject_id: UUID):
    """Fetch an inject."""
    try:
        inject = Inject.objects.get(
            id=inject_id,
            event_id=event_id,
            event__exercise_id=exercise_id,
        )
    except Inject.DoesNotExist:
        return Status(404, {"message": "Inject not found"})

    return Status(200, inject)


@exercises_router.patch(
    "/{exercise_id}/events/{event_id}/injects/{inject_id}/",
    response={
        200: InjectSchema,
        404: NotFoundResponseSchema,
    },
)
def update_inject(
    request,
    exercise_id: UUID,
    event_id: UUID,
    inject_id: UUID,
    payload: InjectUpdateSchema,
):
    """Update an inject."""
    try:
        inject = Inject.objects.get(
            id=inject_id,
            event_id=event_id,
            event__exercise_id=exercise_id,
        )
    except Inject.DoesNotExist:
        return Status(404, {"message": "Inject not found"})

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(inject, field, value)

    inject.save()

    return Status(200, inject)


@exercises_router.delete(
    "/{exercise_id}/events/{event_id}/injects/{inject_id}/",
    response={
        204: None,
        404: NotFoundResponseSchema,
    },
)
def delete_inject(request, exercise_id: UUID, event_id: UUID, inject_id: UUID):
    """Delete an inject."""
    try:
        inject = Inject.objects.get(
            id=inject_id,
            event_id=event_id,
            event__exercise_id=exercise_id,
        )
    except Inject.DoesNotExist:
        return Status(404, {"message": "Inject not found"})

    inject.delete()

    return Status(204, None)


@exercises_router.post(
    "/{exercise_id}/events/{event_id}/injects/{inject_id}/send/",
    response={200: InjectSchema, 403: BadRequestResponseSchema, 404: NotFoundResponseSchema},
)
def send_inject(request, exercise_id: UUID, event_id: UUID, inject_id: UUID):
    """Send an inject card to exercise participants."""
    participant = Participant.objects.filter(
        exercise_id=exercise_id, email__iexact=request.user.email,
        role=Participant.Role.FACILITATOR,
    ).first() if request.user.email else None
    if participant is None:
        return Status(403, {"message": "Only exercise facilitators can send injects."})
    injects = Inject.objects.filter(id=inject_id, event_id=event_id, event__exercise_id=exercise_id)
    if not injects.exists():
        return Status(404, {"message": "Inject not found"})
    injects.filter(started_at__isnull=True).update(started_at=timezone.now())
    return Status(200, injects.get())


@exercises_router.post(
    "/{exercise_id}/events/{event_id}/injects/{inject_id}/cards/",
    response={201: ResponseSchema, 400: BadRequestResponseSchema, 403: BadRequestResponseSchema, 404: NotFoundResponseSchema},
)
def create_card_reply(request, exercise_id: UUID, event_id: UUID, inject_id: UUID, payload: CardReplyCreateSchema):
    """Add a participant reply to a sent inject card."""
    inject = Inject.objects.filter(
        id=inject_id, event_id=event_id, event__exercise_id=exercise_id,
        started_at__isnull=False,
    ).first()
    if inject is None:
        return Status(404, {"message": "Sent inject not found"})
    text = payload.text.strip()
    if not text:
        return Status(400, {"message": "Enter a message."})
    participant = Participant.objects.filter(exercise_id=exercise_id, user=request.user).first()
    if participant is None and request.user.email:
        participant = Participant.objects.filter(
            exercise_id=exercise_id, email__iexact=request.user.email,
        ).first()
    if participant is not None and participant.user_id is None:
        participant.user = request.user
        participant.save(update_fields=["user"])
    if participant is None:
        participant, _ = Participant.objects.get_or_create(
            exercise_id=exercise_id,
            user=request.user,
            defaults={
                "first_name": request.user.first_name or request.user.get_username(),
                "last_name": request.user.last_name,
                "email": request.user.email or None,
                "role": Participant.Role.USER,
            },
        )
    return Status(201, Response.objects.create(inject=inject, participant=participant, type=payload.type, text=text))


@exercises_router.post(
    "/{exercise_id}/events/{event_id}/injects/{inject_id}/responses/",
    response={
        201: ResponseSchema,
        404: NotFoundResponseSchema,
    },
)
def create_response(
    request,
    exercise_id: UUID,
    event_id: UUID,
    inject_id: UUID,
    payload: ResponseCreateSchema,
):
    """Create a response."""
    try:
        inject = Inject.objects.get(
            id=inject_id,
            event_id=event_id,
            event__exercise_id=exercise_id,
        )
    except Inject.DoesNotExist:
        return Status(404, {"message": "Inject not found"})

    try:
        participant = Participant.objects.get(
            id=payload.participant_id,
            exercise_id=exercise_id,
        )
    except Participant.DoesNotExist:
        return Status(404, {"message": "Participant not found"})

    response = Response.objects.create(
        inject=inject,
        participant=participant,
        text=payload.text,
    )

    return Status(201, response)


@exercises_router.get(
    "/{exercise_id}/events/{event_id}/injects/{inject_id}/responses/",
    response={
        200: list[ResponseSchema],
        404: NotFoundResponseSchema,
    },
)
def list_responses(
    request,
    exercise_id: UUID,
    event_id: UUID,
    inject_id: UUID,
):
    """Fetch all responses."""
    try:
        inject = Inject.objects.get(
            id=inject_id,
            event_id=event_id,
            event__exercise_id=exercise_id,
        )
    except Inject.DoesNotExist:
        return Status(404, {"message": "Inject not found"})

    return Status(
        200,
        Response.objects.filter(inject=inject).order_by("created_at"),
    )


@exercises_router.get(
    "/{exercise_id}/events/{event_id}/injects/{inject_id}/responses/{response_id}/",
    response={
        200: ResponseSchema,
        404: NotFoundResponseSchema,
    },
)
def get_response(
    request,
    exercise_id: UUID,
    event_id: UUID,
    inject_id: UUID,
    response_id: UUID,
):
    """Fetch a response."""
    try:
        response = Response.objects.get(
            id=response_id,
            inject_id=inject_id,
            inject__event_id=event_id,
            inject__event__exercise_id=exercise_id,
        )
    except Response.DoesNotExist:
        return Status(404, {"message": "Response not found"})

    return Status(200, response)


@exercises_router.delete(
    "/{exercise_id}/events/{event_id}/injects/{inject_id}/responses/{response_id}/",
    response={
        204: None,
        404: NotFoundResponseSchema,
    },
)
def delete_response(
    request,
    exercise_id: UUID,
    event_id: UUID,
    inject_id: UUID,
    response_id: UUID,
):
    """Delete a response."""
    try:
        response = Response.objects.get(
            id=response_id,
            inject_id=inject_id,
            inject__event_id=event_id,
            inject__event__exercise_id=exercise_id,
        )
    except Response.DoesNotExist:
        return Status(404, {"message": "Response not found"})

    response.delete()

    return Status(204, None)


@exercises_router.post(
    "/{exercise_id}/findings/",
    response={
        201: FindingSchema,
        404: NotFoundResponseSchema,
    },
)
def create_finding(request, exercise_id: UUID, payload: FindingCreateSchema):
    """Create a finding."""
    try:
        exercise = Exercise.objects.get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})

    finding = Finding.objects.create(
        exercise=exercise,
        created_by=request.user,
        **payload.model_dump(),
    )

    return Status(201, finding)


@exercises_router.get(
    "/{exercise_id}/findings/",
    response={
        200: list[FindingSchema],
        404: NotFoundResponseSchema,
    },
)
def list_findings(request, exercise_id: UUID):
    """Fetch all findings."""
    try:
        exercise = Exercise.objects.get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})

    return Status(
        200,
        Finding.objects.filter(exercise=exercise).order_by("created_at"),
    )


@exercises_router.get(
    "/{exercise_id}/findings/{finding_id}/",
    response={
        200: FindingSchema,
        404: NotFoundResponseSchema,
    },
)
def get_finding(request, exercise_id: UUID, finding_id: UUID):
    """Fetch a finding."""
    try:
        finding = Finding.objects.get(
            id=finding_id,
            exercise_id=exercise_id,
        )
    except Finding.DoesNotExist:
        return Status(404, {"message": "Finding not found"})

    return Status(200, finding)


@exercises_router.patch(
    "/{exercise_id}/findings/{finding_id}/",
    response={
        200: FindingSchema,
        404: NotFoundResponseSchema,
    },
)
def update_finding(
    request,
    exercise_id: UUID,
    finding_id: UUID,
    payload: FindingUpdateSchema,
):
    """Update a finding."""
    try:
        finding = Finding.objects.get(
            id=finding_id,
            exercise_id=exercise_id,
        )
    except Finding.DoesNotExist:
        return Status(404, {"message": "Finding not found"})

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(finding, field, value)

    finding.save()

    return Status(200, finding)


@exercises_router.delete(
    "/{exercise_id}/findings/{finding_id}/",
    response={
        204: None,
        404: NotFoundResponseSchema,
    },
)
def delete_finding(request, exercise_id: UUID, finding_id: UUID):
    """Delete a finding."""
    try:
        finding = Finding.objects.get(
            id=finding_id,
            exercise_id=exercise_id,
        )
    except Finding.DoesNotExist:
        return Status(404, {"message": "Finding not found"})

    finding.delete()

    return Status(204, None)


@exercises_router.get(
    "/{exercise_id}/after-action-report/",
    response={
        200: AfterActionReportSchema,
        404: NotFoundResponseSchema,
    },
)
def get_after_action_report(request, exercise_id: UUID):
    """Generate an After Action Report."""
    try:
        exercise = Exercise.objects.get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})

    return Status(200, {"exercise": exercise})
