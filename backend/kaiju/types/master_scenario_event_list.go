package types

type MasterScenarioEventList struct {
	ExerciseID string   `json:"exercise_id"`
	Events     Event    `json:"Events"`
	Injects    []Inject `json:"injects"`
}
