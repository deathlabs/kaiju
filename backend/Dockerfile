FROM alpine:3.24
LABEL image.authors="Victor Fernandez III, @cyberphor"
WORKDIR /home/backend/
COPY entrypoint.sh entrypoint.sh
COPY exercises/ exercises/
COPY kaiju/ kaiju/
COPY pyproject.toml pyproject.toml
COPY uv.lock uv.lock
COPY references/ references/
COPY objectives/ objectives/
COPY manage.py manage.py
ENV UV_PYTHON_INSTALL_DIR=/home/backend/.uv-python
RUN apk add --no-cache uv && \
    uv sync --frozen && \
    (apk del wget || true) &&\
    adduser -D kaiju -h /home/backend/ &&\
    chmod u+x /home/backend/entrypoint.sh &&\
    chown -R kaiju:kaiju /home/backend/
ENV PATH="/home/backend/.venv/bin:$PATH"
USER kaiju
EXPOSE 8000
CMD [ "./entrypoint.sh" ]
