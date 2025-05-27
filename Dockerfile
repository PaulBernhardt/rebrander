# Build stage
FROM --platform=${BUILDPLATFORM} denoland/deno:latest as builder
WORKDIR /app

# Add build argument with a default value
ARG BUILD_MODE=production
ENV BUILD_MODE=${BUILD_MODE}

COPY . .
RUN deno compile --allow-net --allow-read=dist --output rebrander index.ts
RUN deno run build --mode=${BUILD_MODE}

# Production stage
FROM gcr.io/distroless/cc
WORKDIR /app
COPY --from=builder /app/rebrander .
COPY --from=builder /app/dist ./dist
CMD ["./rebrander"]