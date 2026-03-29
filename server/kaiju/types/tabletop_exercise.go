package types

type TableTopExercise struct {
	ID                      string            `json:"id"`
	Title                   string            `json:"Title"`
	References              []Reference       `json:"references"`
	Type                    string            `json:"type"`
	Start                   DateTime          `json:"start"`
	End                     DateTime          `json:"end"`
	Scenario                Scenario          `json:"scenario"`
	Facilitators            []string          `json:"facilitators"`
	Participants            []string          `json:"participants"`
	Objectives              []Objective       `json:"objectives"`
	MSEL                    []Event           `json:"msel"`
	QuestionsToAsk          []Question        `json:"questions_to_ask"`
	PreparationInstructions string            `json:"preparation_instructions"`
	ExecutionInstructions   string            `json:"execution_instructions"`
	AfterActionReview       AfterActionReview `json:"after_action_review"`
}
