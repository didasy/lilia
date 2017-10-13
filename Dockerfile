# Tags: latest, 0.1
# Buid with: docker build --compress --tag didasy/lilia:0.1 --tag didasy/lilia:latest .
# Run with: docker run -p 9000:9000 -v /host/dir:/configuration --name lilia didasy/lilia

FROM mhart/alpine-node:8

WORKDIR /

RUN mkdir /configuration \
    && apk add --no-cache wget \
    && apk add --no-cache tar \
    && wget --no-check-certificate -O /app.tar.gz https://github.com/JesusIslam/lilia/archive/alpha-0.0.1.tar.gz \
    && tar -zxvf /app.tar.gz \
    && rm /app.tar.gz \
    && mv /lilia-alpha-0.0.1 /app \
    && cd /app \
    && npm install

VOLUME ["/configuration"]

EXPOSE 9000

WORKDIR /app

ENTRYPOINT ["npm", "start"]
