FROM gradle:8.14.3-jdk21 AS build

WORKDIR /workspace

COPY settings.gradle.kts build.gradle.kts gradle.properties ./
COPY src ./src

RUN gradle bootJar --no-daemon

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /workspace/build/libs/*.jar /app/salesops-backend.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/salesops-backend.jar"]

