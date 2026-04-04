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
package handlers

import (
	"net/http"
	"strconv"

	"github.com/deathlabs/kaiju/models"
	"github.com/labstack/echo/v5"
	"gorm.io/gorm"
)

func GetTabletopExercise(context *echo.Context) error {
	var (
		database         *gorm.DB
		err              error
		id               int
		tabletopExercise models.TabletopExercise
	)

	id, err = strconv.Atoi(context.Param("id"))
	if err != nil {
		return context.NoContent(http.StatusPreconditionFailed)
	}

	database, _ = context.Get("database").(*gorm.DB)

	err = database.
		Preload("References").
		Preload("Objectives").
		Preload("MasterScenarioEventList").
		Preload("MasterScenarioEventList.Objectives").
		Preload("Questions").
		Where("id = ?", id).
		First(&tabletopExercise).Error

	if err != nil {
		return context.NoContent(http.StatusNotFound)
	}

	return context.JSON(http.StatusOK, tabletopExercise)
}

func GetTabletopExercises(context *echo.Context) error {
	var (
		database          *gorm.DB
		err               error
		tabletopExercises []models.TabletopExercise
	)

	database, _ = context.Get("database").(*gorm.DB)

	err = database.
		Preload("References").
		Preload("Objectives").
		Preload("MasterScenarioEventList").
		Preload("MasterScenarioEventList.Objectives").
		Preload("Questions").
		Find(&tabletopExercises).Error

	if err != nil {
		return context.NoContent(http.StatusInternalServerError)
	}

	return context.JSON(http.StatusOK, tabletopExercises)
}

func PostTabletopExercise(context *echo.Context) error {
	var (
		database         *gorm.DB
		err              error
		tabletopExercise models.TabletopExercise
	)

	database, _ = context.Get("database").(*gorm.DB)

	err = context.Bind(&tabletopExercise)
	if err != nil {
		context.Logger().Error("Bind error", err)
		return context.NoContent(http.StatusPreconditionFailed)
	}

	err = context.Validate(&tabletopExercise)
	if err != nil {
		context.Logger().Error("Validation error", err)
		return context.NoContent(http.StatusPreconditionFailed)
	}

	database.Create(&tabletopExercise)

	return context.JSON(http.StatusOK, tabletopExercise)
}
