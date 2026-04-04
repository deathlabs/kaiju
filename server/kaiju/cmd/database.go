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
package cmd

import (
	"fmt"

	"github.com/deathlabs/kaiju/models"
	"github.com/labstack/echo/v5"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// Set the database context for each request.
func SetDatabaseContext(database *gorm.DB) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(context *echo.Context) error {
			context.Set("database", database)
			return next(context)
		}
	}
}

// Create a database connection based on the database type specified.
func GetDatabase(databaseType string) (*gorm.DB, error) {
	var (
		database *gorm.DB
		err      error
	)

	switch databaseType {
	case "memory":
		database, err = gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
		if err != nil {
			return nil, err
		}
	case "sqlite":
		database, err = gorm.Open(sqlite.Open("kaiju.sqlite"), &gorm.Config{})
		if err != nil {
			return nil, err
		}
	case "postgresql":
		fmt.Println("Using PostgreSQL database")
	default:
		return nil, fmt.Errorf("invalid database type: %s", databaseType)
	}

	err = database.AutoMigrate(
		&models.Reference{},
		&models.Objective{},
		&models.Event{},
		&models.Inject{},
		&models.Question{},
		&models.TabletopExercise{},
	)
	if err != nil {
		return nil, err
	}
	return database, nil
}
