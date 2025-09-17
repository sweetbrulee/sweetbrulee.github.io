FROM mcr.microsoft.com/devcontainers/universal:latest as base

WORKDIR /workspaces/sweetbrulee.github.io

SHELL ["/bin/bash", "-c"]

ENV NODE_OPTIONS=--max-old-space-size=8192

COPY . .

RUN npm install -g bun && \
    bun install


