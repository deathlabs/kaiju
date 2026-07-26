FROM alpine:3.23
LABEL image.authors="Victor Fernandez III, @cyberphor"
WORKDIR /home/kaiju/
COPY checkpoints/ checkpoints/
COPY kaiju/ kaiju/
COPY entrypoint.sh entrypoint.sh
COPY memories/ memories/
COPY requirements.txt requirements.txt
COPY manage.py manage.py
RUN apk add --no-cache --update python3=3.12.13-r0 py3-pip=25.1.1-r1 uvicorn=0.38.0-r0 &&\
    pip install --no-cache-dir --break-system-packages -r requirements.txt &&\
    adduser -D kaiju -h /home/kaiju/ &&\
    chmod u+x /home/kaiju/entrypoint.sh &&\
    chown -R kaiju:kaiju /home/kaiju/
USER kaiju
EXPOSE 8000
CMD [ "./entrypoint.sh" ]
