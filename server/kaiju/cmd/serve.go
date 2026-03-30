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
	"errors"
	"fmt"
	"html/template"
	"net/http"

	"github.com/deathlabs/kaiju/types"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"github.com/spf13/cobra"
)

func getIndex(context *echo.Context) error {
	if context.Request().Header.Get("Accept") == "application/json" {
		return context.NoContent(http.StatusNotAcceptable)
	}

	return context.Render(http.StatusOK, "index.html", nil)
}

func getInject(context *echo.Context) error {
	var (
		err    error
		inject *types.Inject
		store  types.InjectStore
	)

	store = context.Get(storeKey).(types.InjectStore)
	inject, err = store.Get(context.Param("id"))
	if errors.Is(err, errors.New("inject not found")) {
		return context.JSON(http.StatusNotFound, map[string]string{"error": "inject not found"})
	}
	if err != nil {
		return context.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	if context.Request().Header.Get("Accept") == "application/json" {
		return context.JSON(http.StatusOK, inject)
	}
	return context.Render(http.StatusOK, "inject.html", inject)
}

func getInjects(context *echo.Context) error {
	var (
		err     error
		injects []*types.Inject
		store   types.InjectStore
	)

	store = context.Get(storeKey).(types.InjectStore)
	injects, err = store.List()
	if err != nil {
		return context.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return context.JSON(http.StatusOK, injects)
}

func postInject(context *echo.Context) error {
	var (
		err    error
		inject *types.Inject
		store  types.InjectStore
	)

	store = context.Get(storeKey).(types.InjectStore)
	inject = &types.Inject{}
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

func getTableTopExercise(context *echo.Context) error {
	var ttx *types.TableTopExercise = &types.TableTopExercise{ID: context.Param("id")}

	if context.Request().Header.Get("Accept") == "application/json" {
		return context.JSON(http.StatusOK, ttx)
	}

	return context.Render(http.StatusOK, "tabletop-exercise.html", ttx)
}

func getServer(store types.InjectStore) *echo.Echo {
	var (
		api                       *echo.Group
		server                    *echo.Echo
		injectsEndpoint           *echo.Group
		tableTopExercisesEndpoint *echo.Group
	)

	server = echo.New()
	server.Use(middleware.RequestLogger())
	server.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(context *echo.Context) error {
			context.Set(storeKey, store)
			return next(context)
		}
	})
	server.Renderer = &types.TemplateRenderer{
		Templates: template.Must(template.ParseGlob("templates/*.html")),
	}

	server.GET("/", getIndex)
	api = server.Group("/api/v1")

	injectsEndpoint = api.Group("/injects/")
	injectsEndpoint.GET(":id", getInject)
	injectsEndpoint.GET("", getInjects)
	injectsEndpoint.POST("", postInject)

	tableTopExercisesEndpoint = api.Group("/tabletopexercises/")
	tableTopExercisesEndpoint.GET(":id", getTableTopExercise)

	return server
}

func startServer(cmd *cobra.Command, args []string) {
	var (
		err    error
		port   int
		server *echo.Echo
		store  types.InjectStore
	)

	port, err = cmd.Flags().GetInt("port")
	if err != nil {
		server.Logger.Error("failed to parse port argument", "error", err)
	}

	store = types.NewMemoryStore()
	server = getServer(store)
	err = server.Start(fmt.Sprintf(":%d", port))
	if err != nil {
		server.Logger.Error("failed to start", "error", err)
	}
}

var startCmd = &cobra.Command{
	Use:   "start",
	Short: "Start kaiju",
	Run:   startServer,
}

func init() {
	rootCmd.AddCommand(startCmd)
	startCmd.Flags().Int("port", 8001, "Port to serve from")
}
