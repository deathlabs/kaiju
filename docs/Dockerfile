FROM alpine:3.23
LABEL image.authors="Vic Fernandez III <@cyberphor>"
WORKDIR /home/kaiju/
COPY entrypoint.sh entrypoint.sh
COPY mkdocs.yml mkdocs.yml
COPY requirements.txt requirements.txt
COPY kaiju/ kaiju/
RUN apk add --no-cache --update mkdocs python3 py3-pip &&\
    pip install --break-system-packages -r requirements.txt &&\
    adduser -D kaiju -h /home/kaiju &&\
    chown -R kaiju:kaiju /home/kaiju &&\
    chmod +x entrypoint.sh
USER kaiju
EXPOSE 5050
ENTRYPOINT [ "./entrypoint.sh" ]
