# Standard library imports.
from uuid import UUID

# Third party imports.
from ninja import NinjaAPI, Status

# Local imports.
from exercises.models import Exercise
from exercises.schemas import (
    ExerciseCreateSchema,
    ExerciseSchema,
    ExerciseUpdateSchema,
    NotFoundSchema,
)

# Init the exercises API.
api = NinjaAPI(urls_namespace="exercises")


@api.get("/", response=list[ExerciseSchema])
def list_exercises(request):
    """Return all exercises."""
    return Exercise.objects.all()


@api.get("/{exercise_id}/", response={200: ExerciseSchema, 404: NotFoundSchema})
def get_exercise(request, exercise_id: UUID):
    """Return an exercise by its ID."""
    try:
        return Exercise.objects.get(id=exercise_id)
    except Exercise.DoesNotExist:
        return Status(404, {"message": "Exercise not found"})


@api.post("/", response={201: ExerciseSchema})
def create_exercise(request, payload: ExerciseCreateSchema):
    """Create an exercise."""
    exercise = Exercise.objects.create(**payload.model_dump())
    return Status(201, exercise)


@api.patch("/{exercise_id}/", response={200: ExerciseSchema, 404: NotFoundSchema})
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
