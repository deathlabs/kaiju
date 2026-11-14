FROM alpine:3.24
LABEL image.authors="Victor Fernandez III, @cyberphor"
SHELL ["/bin/ash", "-o", "pipefail", "-c"]
WORKDIR /home/backend/
COPY entrypoint.sh entrypoint.sh
COPY kaiju/ kaiju/
WORKDIR /home/backend/kaiju/
ENV UV_PYTHON_INSTALL_DIR=/home/backend/.uv-python
RUN apk add --no-cache python3 uv && \
    apk upgrade --no-cache libcrypto3 libssl3 zlib &&\
    uv sync --frozen --python /usr/bin/python3 && \
    uv run python -m pip uninstall pip -y || true &&\
    (apk del wget || true) &&\
    adduser -D kaiju -h /home/backend/ &&\
    chmod u+x /home/backend/entrypoint.sh &&\
    chown -R kaiju:kaiju /home/backend/
ENV PATH="/home/backend/kaiju/.venv/bin:$PATH"
USER kaiju
EXPOSE 8000
CMD [ "/home/backend/entrypoint.sh" ]
