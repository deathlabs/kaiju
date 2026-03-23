package types

type AfterActionReview struct {
	Summary                 string      `json:"summary"`
	Objectives              []Objective `json:"objectives"`
	Facilitators            []string    `json:"facilitators"`
	Participants            []string    `json:"participants"`
	MasterScenarioEventList []Event     `json:"master_scenario_event_list"`
	Sustainments            []string    `json:"sustainments"`
	Improvements            []string    `json:"improvements"`
}
