package types

import (
	"html/template"
	"io"

	"github.com/labstack/echo/v5"
)

type TemplateRenderer struct {
	Templates *template.Template
}

func (templateRenderer *TemplateRenderer) Render(context *echo.Context, w io.Writer, name string, data any) error {
	return templateRenderer.Templates.ExecuteTemplate(w, name, data)
}
