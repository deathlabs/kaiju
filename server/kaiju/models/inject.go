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

type Inject struct {
	ID                int    `json:"id" gorm:"primaryKey"`
	EventID           int    `json:"event_id" validate:"required"`
	Event             Event  `json:"event,omitempty" gorm:"foreignKey:EventID"`
	ScheduledDateTime string `json:"scheduled_date_time" validate:"required"`
	DeliveryMethod    string `json:"delivery_method" validate:"required,oneof=email chat call card"`
	Sender            string `json:"sender" validate:"required"`
	Receiver          string `json:"receiver" validate:"required"`
	Message           string `json:"message" validate:"required"`
}
