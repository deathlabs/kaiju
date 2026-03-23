package types

type Event struct {
	ID                string   `json:"id"`
	Description       string   `json:"description"`
	ExpectedActions   string   `json:"expected_actions"`
	RelatedObjectives []string `json:"related_objectives"`
	Injects           []Inject `json:"injects"`
}
