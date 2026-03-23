package types

type DateTime struct {
	Date     string `json:"date"`
	Time     string `json:"time"`
	Timezone string `json:"timezone"`
}
