package types

type Question struct {
	ID             string `json:"id"`
	Question       string `json:"question"`
	AnswerExpected string `json:"answer_expected"`
	AnswerGiven    string `json:"answer_given"`
}
