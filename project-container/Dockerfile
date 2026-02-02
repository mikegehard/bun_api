FROM debian:bookworm-slim

ARG USERNAME=appuser
ENV USERNAME=$USERNAME

# Install basic tools
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  git \
  unzip \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m $USERNAME

RUN mkdir -p /workspace && chown -R $USERNAME:$USERNAME /workspace

# Set up non-root user
USER $USERNAME

# Install Bun runtime
RUN set -e && \
  mkdir -p /home/$USERNAME/.bun/bin && \
  case "$(uname -m)" in x86_64|amd64) arch="x64" ;; arm64|aarch64) arch="aarch64" ;; *) exit 1 ;; esac && \
  target="linux-${arch}" && \
  if ldd /bin/ls 2>&1 | grep -q musl; then target="${target}-musl"; fi && \
  curl --fail --location --progress-bar --output /tmp/bun.zip \
  "https://github.com/oven-sh/bun/releases/latest/download/bun-${target}.zip" && \
  unzip -oqd /tmp/bun-extract /tmp/bun.zip && \
  mv /tmp/bun-extract/bun-${target}/bun /home/$USERNAME/.bun/bin/bun && \
  chmod +x /home/$USERNAME/.bun/bin/bun && \
  rm -rf /tmp/bun.zip /tmp/bun-extract

ENV PATH="/home/${USERNAME}/.bun/bin:$PATH"

WORKDIR /workspace
