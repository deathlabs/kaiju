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

func GetInject(context *echo.Context) error {
	var (
		database *gorm.DB
		err      error
		id       int
		inject   models.Inject
	)

	id, err = strconv.Atoi(context.Param("id"))
	if err != nil {
		return context.NoContent(http.StatusPreconditionFailed)
	}

	database, _ = context.Get("database").(*gorm.DB)

	err = database.
		Preload("Event").
		Preload("Event.Objectives").
		Where("id = ?", id).
		First(&inject).Error
	if err != nil {
		return context.NoContent(http.StatusNotFound)
	}

	return context.JSON(http.StatusOK, inject)
}

func GetInjects(context *echo.Context) error {
	var (
		database *gorm.DB
		err      error
		injects  []models.Inject
	)

	database, _ = context.Get("database").(*gorm.DB)

	err = database.
		Preload("Event").
		Preload("Event.Objectives").
		Find(&injects).Error
	if err != nil {
		return context.NoContent(http.StatusInternalServerError)
	}

	return context.JSON(http.StatusOK, injects)
}

func PostInject(context *echo.Context) error {
	var (
		database *gorm.DB
		err      error
		inject   models.Inject
	)

	database, _ = context.Get("database").(*gorm.DB)

	err = context.Bind(&inject)
	if err != nil {
		context.Logger().Error("Bind error", err)
		return context.NoContent(http.StatusPreconditionFailed)
	}

	err = context.Validate(&inject)
	if err != nil {
		context.Logger().Error("Validation error", err)
		return context.NoContent(http.StatusPreconditionFailed)
	}

	database.Create(&inject)

	return context.JSON(http.StatusOK, inject)
}
