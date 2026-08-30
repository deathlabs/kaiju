# Standard library imports.
from uuid import UUID

# Third party imports.
from django.db import transaction
from ninja import Router, Status
from objectives.models import Objective
from references.models import Reference

# Local imports.
from exercises.models import Exercise, Participant
from exercises.schemas import (
    BadRequestResponseSchema,
    ExerciseCreateSchema,
    ExerciseSchema,
    ExerciseUpdateSchema,
    NotFoundResponseSchema,
    ParticipantCreateSchema,
    ParticipantSchema,
    ParticipantUpdateSchema,
)

# Init the exercises router.
router = Router(tags=["exercises"])


@router.post("/", response={201: ExerciseSchema})
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
        email=request.user.email,
        role=Participant.Role.FACILITATOR,
    )

    return Status(201, exercise)


@router.get("/", response={200: list[ExerciseSchema]})
def list_exercises(request):
    """Fetch all exercises."""
    return Status(200, Exercise.objects.all())


@router.get(
    "/{exercise_id}/",
    response={
        200: ExerciseSchema,
        404: NotFoundResponseSchema,
    },
)
def get_exercise(request, exercise_id: UUID):
    """Fetch an exercise by its ID."""
    try:
        return Status(200, Exercise.objects.get(id=exercise_id))
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})


@router.patch(
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


@router.delete(
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


@router.post(
    "/{exercise_id}/participants/",
    response={
        201: ParticipantSchema,
        404: NotFoundResponseSchema,
    },
)
def create_participant(request, exercise_id: UUID, payload: ParticipantCreateSchema):
    """Create a participant for an exercise."""
    try:
        exercise = Exercise.objects.get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})

    participant = Participant.objects.create(
        exercise=exercise,
        **payload.model_dump(),
    )

    return Status(201, participant)


@router.get(
    "/{exercise_id}/participants/",
    response={
        200: list[ParticipantSchema],
        404: NotFoundResponseSchema,
    },
)
def list_participants(request, exercise_id: UUID):
    """Fetch all participants for an exercise."""
    try:
        exercise = Exercise.objects.get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})

    return Status(
        200,
        Participant.objects.filter(exercise=exercise),
    )


@router.get(
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


@router.patch(
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


@router.delete(
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
