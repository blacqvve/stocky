# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /stocky-api ./cmd/api

# Runtime stage
FROM gcr.io/distroless/static-debian12
COPY --from=builder /stocky-api /stocky-api
EXPOSE 8080
ENTRYPOINT ["/stocky-api"]
