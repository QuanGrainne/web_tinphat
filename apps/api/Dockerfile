# syntax=docker/dockerfile:1

# Build stage: resolve dependencies from pom.xml alone first so source edits reuse that layer.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml ./
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp -DskipTests package

# Runtime stage: JRE only, non-root. Heap and GC flags come from JAVA_TOOL_OPTIONS (compose).
FROM eclipse-temurin:21-jre
RUN groupadd --system --gid 10001 dna \
    && useradd --system --uid 10001 --gid dna --home-dir /app --shell /usr/sbin/nologin dna \
    && mkdir -p /app/uploads \
    && chown -R dna:dna /app
WORKDIR /app
COPY --from=build --chown=dna:dna /build/target/api.jar /app/api.jar
USER dna
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/api.jar"]
