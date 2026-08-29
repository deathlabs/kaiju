# Standard library imports.
from uuid import UUID

# Third party imports.
from ninja import Router, Status

# Local imports.
from exercises.models import Exercise, Participant
from exercises.schemas import (
    BadRequestSchema,
    ExerciseCreateSchema,
    ExerciseSchema,
    ExerciseUpdateSchema,
    NotFoundSchema,
    ParticipantCreateSchema,
    ParticipantSchema,
    ParticipantUpdateSchema,
)

# Init the exercises router.
router = Router(tags=["exercises"])


@router.post("/", response={201: ExerciseSchema, 404: NotFoundSchema})
def create_exercise(request, payload: ExerciseCreateSchema):
    """Create an exercise."""
    exercise = Exercise.objects.create(**payload.model_dump())
    return Status(201, exercise)


@router.get("/", response=list[ExerciseSchema])
def list_exercises(request):
    """Fetch all exercises."""
    return Exercise.objects.all()


@router.get("/{exercise_id}/", response={200: ExerciseSchema, 404: NotFoundSchema})
def get_exercise(request, exercise_id: UUID):
    """Fetch an exercise by its ID."""
    try:
        return Exercise.objects.get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})


@router.patch("/{exercise_id}/", response={200: ExerciseSchema, 404: NotFoundSchema})
def update_exercise(request, exercise_id: UUID, payload: ExerciseUpdateSchema):
    """Update an exercise."""
    try:
        exercise = Exercise.objects.get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(exercise, field, value)
    exercise.save()
    return exercise


@router.post(
    "/{exercise_id}/participants/",
    response={201: ParticipantSchema, 400: BadRequestSchema, 404: NotFoundSchema},
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
    response={200: list[ParticipantSchema], 404: NotFoundSchema},
)
def list_participants(request, exercise_id: UUID):
    """Fetch all participants for an exercise."""
    try:
        exercise = Exercise.objects.get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})

    return Participant.objects.filter(exercise=exercise)


@router.get(
    "/{exercise_id}/participants/{participant_id}/",
    response={200: ParticipantSchema, 404: NotFoundSchema},
)
def get_participant(request, exercise_id: UUID, participant_id: UUID):
    """Fetch a participant by its ID."""
    try:
        return Participant.objects.get(id=participant_id, exercise_id=exercise_id)
    except Participant.DoesNotExist:
        return Status(404, {"message": "Participant not found"})


@router.patch(
    "/{exercise_id}/participants/{participant_id}/",
    response={200: ParticipantSchema, 404: NotFoundSchema},
)
def update_participant(
    request, exercise_id: UUID, participant_id: UUID, payload: ParticipantUpdateSchema
):
    """Update a participant."""
    try:
        participant = Participant.objects.get(
            id=participant_id, exercise_id=exercise_id
        )
    except Participant.DoesNotExist:
        return Status(404, {"message": "Participant not found"})

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(participant, field, value)
    participant.save()
    return participant
