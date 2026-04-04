FROM alpine:3.23 AS stage_1
LABEL image.authors="Vic Fernandez III <@cyberphor>"
WORKDIR /home/
COPY kaiju/go.mod .
RUN apk add --no-cache go &&\
    go mod download
COPY kaiju/ .
RUN go build -ldflags="-s -w" kaiju/main.go -o kaiju
