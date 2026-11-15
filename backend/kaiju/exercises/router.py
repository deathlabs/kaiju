# Standard library imports.
from uuid import UUID

# Third party imports.
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import QuerySet
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
    EventCreateSchema,
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

    Participant.objects.create(
        exercise=exercise,
        first_name=facilitator.first_name,
        last_name=facilitator.last_name,
        email=facilitator.email or None,
        role=Participant.Role.FACILITATOR,
    )

    return Status(201, exercise)


@exercises_router.get("/", response={200: list[ExerciseListSchema]})
def list_exercises(request):
    """Fetch all exercises."""
    return Status(
        200,
        Exercise.objects.select_related("created_by", "updated_by").prefetch_related(
            "objectives",
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
        exercise = Exercise.objects.get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})

    data = payload.model_dump(exclude_unset=True)

    new_objective_data = data.pop("new_objectives", None)
    new_reference_data = data.pop("new_references", None)
    reference_ids = data.pop("reference_ids", None)
    objective_ids = data.pop("objective_ids", None)
    facilitator_username = data.pop("facilitator_username", None)

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

    for field, value in data.items():
        setattr(exercise, field, value)

    exercise.updated_by = request.user
    exercise.save()

    if objective_ids is not None or new_objective_data:
        exercise.objectives.set(objectives)

    if reference_ids is not None or new_reference_data:
        exercise.references.set(references)

    if facilitator is not None:
        current_facilitator = (
            exercise.participants.filter(
                role=Participant.Role.FACILITATOR,
            )
            .order_by("created_at")
            .first()
        )
        selected_participant = exercise.participants.filter(
            email=facilitator.email,
        ).first()

        if selected_participant is None:
            selected_participant = current_facilitator or Participant(exercise=exercise)
        elif current_facilitator and selected_participant != current_facilitator:
            current_facilitator.role = Participant.Role.USER
            current_facilitator.save(update_fields=["role", "updated_at"])

        selected_participant.first_name = facilitator.first_name
        selected_participant.last_name = facilitator.last_name
        selected_participant.email = facilitator.email or None
        selected_participant.role = Participant.Role.FACILITATOR
        selected_participant.save()

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
    objective_ids = data.pop("objective_ids")
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

    event = Event.objects.create(
        exercise=exercise,
        **data,
    )

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
    objective_ids = data.pop("objective_ids", None)

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
