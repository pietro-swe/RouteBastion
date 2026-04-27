FROM golang:1.26-alpine

WORKDIR /app

RUN apk add --no-cache git \
  && go install github.com/air-verse/air@latest \
	&& go install github.com/go-delve/delve/cmd/dlv@latest

COPY apps/broker/go.mod apps/broker/go.sum ./apps/broker/

WORKDIR /app/apps/broker
RUN mkdir -p /tmp/air && chmod 777 /tmp/air && go mod download

EXPOSE 8090 40000

CMD ["air"]
