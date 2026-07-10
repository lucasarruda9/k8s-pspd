FROM golang:1.25-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/server ./cmd/server

FROM scratch AS runtime
COPY --from=build /out/server /server

USER 65534:65534

EXPOSE 50053 9103

ENTRYPOINT ["/server"]
