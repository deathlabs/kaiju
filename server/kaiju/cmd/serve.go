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
	"html/template"
	"os"

	"github.com/deathlabs/kaiju/internal/handlers"
	"github.com/deathlabs/kaiju/internal/models"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"github.com/spf13/cobra"
)

func getServer(store models.InjectStore) *echo.Echo {
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
			context.Set(handlers.StoreKey, store)
			return next(context)
		}
	})
	server.Renderer = &models.TemplateRenderer{
		Templates: template.Must(template.ParseGlob("templates/*.html")),
	}
	server.GET("/", handlers.GetIndex)

	api = server.Group("/api/v1")

	injectsEndpoint = api.Group("/injects/")
	injectsEndpoint.GET(":id", handlers.GetInjects)
	injectsEndpoint.GET("", handlers.GetInjects)

	tableTopExercisesEndpoint = api.Group("/tabletopexercises/")
	tableTopExercisesEndpoint.GET(":id", handlers.GetTableTopExercise)

	return server
}

func startServer(cmd *cobra.Command, args []string) {
	var (
		err    error
		port   int
		server *echo.Echo
		store  models.InjectStore
	)

	port, err = cmd.Flags().GetInt("port")
	if err != nil {
		server.Logger.Error("failed to get port argument", "error", err)
	}

	store = store.NewMemoryStore()
	server = getServer(store)
	err = server.Start(fmt.Sprintf(":%d", port))
	if err != nil {
		server.Logger.Error("failed to start", "error", err)
	}
}

var rootCmd = &cobra.Command{
	Use:   "kaiju",
	Short: "Kaiju is a tool for creating and conducting tabletop exercises.",
	Args:  cobra.ArbitraryArgs,
	Run:   startServer,
}

func init() {
	rootCmd.Flags().Int("port", 8001, "Port to serve from")
}

func Execute() {
	var err = rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}
