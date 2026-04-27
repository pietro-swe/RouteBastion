FROM golang:1.26.2-alpine AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build \
  -ldflags="-s -w" \
  -trimpath \
  -o broker ./cmd

FROM scratch

COPY --from=build /etc/passwd /etc/passwd
COPY --from=build /etc/group /etc/group

COPY --from=build /app/app.env /app/app.env
COPY --from=build /app/broker /app/broker

WORKDIR /app

USER 1000:1000

EXPOSE 8090
CMD ["/app/broker"]
