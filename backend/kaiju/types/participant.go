package types

type Participant struct {
	ParticipantID string `json:"participant_id"`
	FirstName     string `json:"first_name"`
	LastName      string `json:"last_name"`
	Role          string `json:"role"`
	TeamID        string `json:"team_id"`
}
