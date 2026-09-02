# Standard library imports.
from uuid import UUID

# Third party imports.
from django.db import transaction
from ninja import Router, Status
from objectives.models import Objective
from references.models import Reference

# Local imports.
from exercises.models import Event, Exercise, Inject, Participant, Response
from exercises.schemas import (
    BadRequestResponseSchema,
    EventCreateSchema,
    EventSchema,
    EventUpdateSchema,
    ExerciseCreateSchema,
    ExerciseListSchema,
    ExerciseSchema,
    ExerciseUpdateSchema,
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

# Init the exercises router.
exercises_router = Router(tags=["exercises"])


@exercises_router.post("/", response={201: ExerciseSchema})
@transaction.atomic
def create_exercise(request, payload: ExerciseCreateSchema):
    """Create an exercise."""
    exercise = Exercise.objects.create(
        created_by=request.user,
        **payload.model_dump(),
    )

    Participant.objects.create(
        exercise=exercise,
        first_name=request.user.first_name,
        last_name=request.user.last_name,
        email=request.user.email or None,
        role=Participant.Role.FACILITATOR,
    )

    return Status(201, exercise)


@exercises_router.get("/", response={200: list[ExerciseListSchema]})
def list_exercises(request):
    """Fetch all exercises."""
    return Status(200, Exercise.objects.all())


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
        return Status(200, Exercise.objects.get(id=exercise_id))
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})


@exercises_router.patch(
    "/{exercise_id}/",
    response={
        200: ExerciseSchema,
        404: NotFoundResponseSchema,
    },
)
def update_exercise(request, exercise_id: UUID, payload: ExerciseUpdateSchema):
    """Update an exercise."""
    try:
        exercise = Exercise.objects.get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})

    data = payload.model_dump(exclude_unset=True)

    reference_ids = data.pop("reference_ids", None)
    objective_ids = data.pop("objective_ids", None)

    for field, value in data.items():
        setattr(exercise, field, value)

    exercise.save()

    if objective_ids is not None:
        objectives = Objective.objects.filter(id__in=objective_ids)
        exercise.objectives.set(objectives)

    if reference_ids is not None:
        references = Reference.objects.filter(id__in=reference_ids)
        exercise.references.set(references)

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
def update_participant(
    request,
    exercise_id: UUID,
    participant_id: UUID,
    payload: ParticipantUpdateSchema,
):
    """Update a participant."""
    try:
        participant = Participant.objects.get(
            id=participant_id,
            exercise_id=exercise_id,
        )
    except Participant.DoesNotExist:
        return Status(404, {"message": "Participant not found"})

    data = payload.model_dump(exclude_unset=True)
    new_role = data.get("role")

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
def delete_participant(request, exercise_id: UUID, participant_id: UUID):
    """Delete a participant."""
    try:
        participant = Participant.objects.get(
            id=participant_id,
            exercise_id=exercise_id,
        )
    except Participant.DoesNotExist:
        return Status(404, {"message": "Participant not found"})

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


@exercises_router.post(
    "/{exercise_id}/events/",
    response={
        201: EventSchema,
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
    objective_ids = data.pop("objective_ids")

    event = Event.objects.create(
        exercise=exercise,
        **data,
    )

    objectives = Objective.objects.filter(id__in=objective_ids)
    event.objectives.set(objectives)

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

    objective_ids = data.pop("objective_ids", None)

    for field, value in data.items():
        setattr(event, field, value)

    event.save()

    if objective_ids is not None:
        objectives = Objective.objects.filter(id__in=objective_ids)
        event.objectives.set(objectives)

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

    data = payload.model_dump()
    recipient_id = data.pop("recipient_id")

    try:
        recipient = Participant.objects.get(
            id=recipient_id,
            exercise_id=exercise_id,
        )
    except Participant.DoesNotExist:
        return Status(404, {"message": "Participant not found"})

    inject = Inject.objects.create(
        event=event,
        recipient=recipient,
        **data,
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

    data = payload.model_dump(exclude_unset=True)

    for field, value in data.items():
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
