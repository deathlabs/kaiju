FROM alpine:3.23 AS stage_1
LABEL image.authors="Vic Fernandez III <@cyberphor>"
WORKDIR kaiju
COPY kaiju/go.mod .
RUN apk add --no-cache go &&\
    go mod download
COPY kaiju/ .
RUN go build -ldflags="-s -w" -o kaiju

FROM alpine:3.23
LABEL image.authors="Vic Fernandez III <@cyberphor>"
WORKDIR /home/kaiju/
COPY --from=stage_1 /kaiju/kaiju /usr/local/bin/kaiju
RUN adduser -D kaiju -h /home/kaiju &&\
    chown -R kaiju:kaiju /home/kaiju &&\
    chmod +x /usr/local/bin/kaiju
USER kaiju
EXPOSE 8001
ENTRYPOINT [ "kaiju", "start", "--port", "8001" ]
