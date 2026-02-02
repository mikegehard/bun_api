# Bun/TypeScript development container for api_bun
FROM debian:trixie-slim

ARG USERNAME=developer
ENV USERNAME=$USERNAME

# Install basic development tools
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  git \
  unzip \
  sudo \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m $USERNAME && \
  echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/$USERNAME

RUN mkdir -p /workspace && chown -R $USERNAME:$USERNAME /workspace

# Switch to non-root user
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
