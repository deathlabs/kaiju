/*
Copyright © 2026 Vic Fernandez III <@cyberphor>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
package models

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
