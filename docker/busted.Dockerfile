FROM ghcr.io/lunarmodules/busted:master

RUN apk add --no-cache entr

WORKDIR /data

ENTRYPOINT ["busted", "--verbose", "--output=gtest"]