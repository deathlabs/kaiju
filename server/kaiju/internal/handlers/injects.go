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

	"github.com/deathlabs/kaiju/internal/models"
	"github.com/labstack/echo/v5"
)

func GetInjects(context *echo.Context) error {
	var (
		err     error
		injects []*models.Inject
		store   models.Store[models.Inject]
	)

	injects, err = store.List()
	if err != nil {
		return context.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return context.JSON(http.StatusOK, injects)
}

func PostInject(context *echo.Context) error {
	var (
		err    error
		inject *models.Inject
		store  models.Store[models.Inject]
	)

	inject = &models.Inject{}
	if err = context.Bind(inject); err != nil {
		return context.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	if inject.ID == "" {
		return context.JSON(http.StatusBadRequest, map[string]string{"error": "id is required"})
	}
	if err = store.Save(inject); err != nil {
		return context.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return context.JSON(http.StatusCreated, inject)
}
