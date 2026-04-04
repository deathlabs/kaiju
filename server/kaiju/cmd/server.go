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

	"github.com/deathlabs/kaiju/handlers"
	"github.com/deathlabs/kaiju/models"
	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"github.com/spf13/cobra"
	"gorm.io/gorm"
)

func getAddress(cmd *cobra.Command) (string, error) {
	var (
		address string
		err     error
		port    int
	)

	// Get port.
	port, err = cmd.Flags().GetInt("port")
	if err != nil {
		return "", err
	}

	// Set address.
	address = fmt.Sprintf(":%d", port)
	return address, nil
}

func getServer() (*echo.Echo, error) {
	var (
		err      error
		database *gorm.DB
		server   *echo.Echo
	)

	// Init an HTTP server.
	server = echo.New()

	// Set the HTML renderer for the HTTP server.
	server.Renderer = &models.CustomTemplateRenderer{
		Templates: template.Must(template.ParseGlob("templates/*.html")),
	}

	// Set the model validator for the HTTP server.
	server.Validator = &models.CustomValidator{
		Validator: validator.New(),
	}

	// Add middleware to the HTTP server.
	server.Use(middleware.RequestLogger())
	database, err = GetDatabase(databaseType)
	if err != nil {
		return nil, err
	}
	server.Use(SetDatabaseContext(database))

	// Add routes to the HTTP server.
	server.GET("/", handlers.GetIndex)
	server.GET("/injects", handlers.GetInjects)
	server.POST("/injects", handlers.PostInject)
	server.GET("/injects/:id", handlers.GetInject)

	server.GET("/tabletop-exercises", handlers.GetTabletopExercises)
	server.POST("/tabletop-exercises", handlers.PostTabletopExercise)
	server.GET("/tabletop-exercises/:id", handlers.GetTabletopExercise)

	return server, nil
}

func startServer(cmd *cobra.Command, args []string) error {
	var (
		address string
		err     error
		server  *echo.Echo
	)

	// Get address.
	address, err = getAddress(cmd)
	if err != nil {
		return err
	}

	// Get a HTTP server.
	server, err = getServer()
	if err != nil {
		return err
	}

	// Respond to HTTP requests.
	err = server.Start(address)
	if err != nil {
		return err
	}

	return nil
}
