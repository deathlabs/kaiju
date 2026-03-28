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
	"io"
	"net/http"

	"github.com/deathlabs/kaiju/types"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"github.com/spf13/cobra"
)

type Templates struct {
	templates *template.Template
}

func (t *Templates) Render(context *echo.Context, w io.Writer, name string, data interface{}) error {
	return t.templates.ExecuteTemplate(w, name, data)
}

func getIndex(context *echo.Context) error {
	return context.Render(http.StatusOK, "index.html", nil)
}

func getInject(context *echo.Context) error {
	var inject *types.Inject
	inject = &types.Inject{ID: context.Param("id")}
	return context.JSON(http.StatusOK, inject)
}

func getTableTopExercise(context *echo.Context) error {
	var ttx *types.TableTopExercise
	ttx = &types.TableTopExercise{ID: context.Param("id")}

	if context.Request().Header.Get("HX-Request") == "true" {
		return context.Render(http.StatusOK, "ttx.html", ttx)
	}
	return context.JSON(http.StatusOK, ttx)
}

func getServer() *echo.Echo {
	var (
		server *echo.Echo
		api *echo.Group
	)

	server = echo.New()
	server.Use(middleware.RequestLogger())
	server.Renderer = &Templates{
		templates: template.Must(template.ParseGlob("templates/*.html")),
	}
	server.GET("/", getIndex)

	api = server.Group("/api/v1")
	api.GET("/injects/:id", getInject)
	api.GET("/tabletopexercises/:id", getTableTopExercise)

	return server
}

func startServer(cmd *cobra.Command, args []string) {
	var (
		api  *echo.Echo
		err  error
		port int
	)

	port, err = cmd.Flags().GetInt("port")
	if err != nil {
		api.Logger.Error("failed to parse port argument", "error", err)
	}

	api = getServer()
	err = api.Start(fmt.Sprintf(":%d", port))
	if err != nil {
		api.Logger.Error("failed to start", "error", err)
	}
}

var startCmd = &cobra.Command{
	Use:   "start",
	Short: "Start kaiju.",
	Run:   startServer,
}

func init() {
	rootCmd.AddCommand(startCmd)
	startCmd.Flags().Int("port", 8001, "Port to serve from")
}
