package types

type Exercise struct {
	Title       string         `json:"title"`
	Scenario    string         `json:"scenario"`
	Description string         `json:"description"`
	Status      ExerciseStatus `json:"status"`
	DateCreated DateTime       `json:"date_created"`
	DateStarted DateTime       `json:"date_started"`
	DateEnded   DateTime       `json:"date_ended"`
}
