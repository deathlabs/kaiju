package types

type Scenario struct {
	DateTime        DateTime `json:"date_time"`
	ActivityType    string   `json:"activity_type"`
	System          string   `json:"system"`
	SystemComponent string   `json:"system_component"`
}
