package types

type ExerciseStatus string

const (
	StatusDraft    ExerciseStatus = "draft"
	StatusActive   ExerciseStatus = "active"
	StatusComplete ExerciseStatus = "complete"
)
