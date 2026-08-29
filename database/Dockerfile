FROM alpine:3.23
LABEL image.authors="Victor Fernandez III, @cyberphor"
WORKDIR /home/database/
COPY entrypoint.sh entrypoint.sh
RUN apk add --no-cache postgresql postgresql-contrib libpq-dev &&\
    chown postgres:postgres /home/database/entrypoint.sh &&\
    chmod 755 /home/database/entrypoint.sh &&\
    mkdir /var/lib/postgresql/data &&\
    mkdir /run/postgresql &&\
    chown -R postgres:postgres /var/lib/postgresql/data &&\
    chown -R postgres:postgres /run/postgresql
USER postgres
EXPOSE 5432
CMD ["./entrypoint.sh"]
