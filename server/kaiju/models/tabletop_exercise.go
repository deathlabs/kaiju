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

type TabletopExercise struct {
	ID                      int         `json:"id" gorm:"primaryKey"`
	References              []Reference `json:"references" gorm:"many2many:exercise_references;joinForeignKey:TabletopExerciseID;joinReferences:ReferenceID" validate:"required,min=1,dive"`
	Objectives              []Objective `json:"objectives" gorm:"many2many:exercise_objectives;joinForeignKey:TabletopExerciseID;joinReferences:ObjectiveID" validate:"required,min=1,dive"`
	Type                    string      `json:"type" validate:"required,oneof='Discussion Only' 'Discussion and Hands-On'"`
	StartTime               string      `json:"start_time" validate:"required"`
	EndTime                 string      `json:"end_time" validate:"required"`
	Scenario                string      `json:"scenario" validate:"required"`
	MasterScenarioEventList []Event     `json:"master_scenario_event_list" gorm:"many2many:exercise_events;joinForeignKey:TabletopExerciseID;joinReferences:EventID" validate:"required,min=1,dive"`
	Questions               []Question  `json:"questions" gorm:"foreignKey:TabletopExerciseID" validate:"required,min=1,dive"`
}
