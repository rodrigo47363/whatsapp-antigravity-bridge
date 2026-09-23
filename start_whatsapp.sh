#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

NODE_BIN="$(which node 2>/dev/null || echo "$HOME/.nvm/versions/node/$(ls -1 "$HOME/.nvm/versions/node" 2>/dev/null | tail -n 1)/bin/node")"

if [ ! -x "$NODE_BIN" ]; then
    echo "[-] Error: Node.js no encontrado en PATH ni en NVM."
    exit 1
fi

"$NODE_BIN" index.js
