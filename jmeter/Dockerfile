FROM eclipse-temurin:17-jre

ARG JMETER_VERSION=5.6.3
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-${JMETER_VERSION}.tgz | tar -xz -C /opt \
    && ln -s /opt/apache-jmeter-${JMETER_VERSION} /opt/jmeter \
    && apt-get purge -y curl \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/opt/jmeter/bin:${PATH}"
ENV JVM_ARGS="-Xms512m -Xmx2g"
WORKDIR /work
ENTRYPOINT ["jmeter"]
