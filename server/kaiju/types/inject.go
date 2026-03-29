package types

type Inject struct {
	ID string `json:"id"`
	DateTime
	DeliveryMethod string `json:"delivery_method"`
	Sender         string `json:"sender"`
	Receiver       string `json:"receiver"`
	Message        string `json:"message"`
}
