FROM alpine:3.23 AS stage_1
LABEL image.authors="Vic Fernandez III <@cyberphor>"
WORKDIR /home/kaiju
RUN apk add --no-cache go
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -ldflags="-s -w" -o kaiju .

FROM alpine:3.23
LABEL image.authors="Vic Fernandez III <@cyberphor>"
WORKDIR /home/kaiju/
COPY --from=stage_1 /home/kaiju kaiju
RUN adduser -D kaiju -h /home/kaiju &&\
    chown -R kaiju:kaiju /home/kaiju &&\
    chmod +x kaiju
USER kaiju
EXPOSE 8001
ENTRYPOINT [ "./entrypoint.sh" ]
