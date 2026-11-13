#!/usr/bin/env bash
# Source this helper. Timeouts cover the command and its entire process group.
run_with_timeout() {
  python3 - "$@" <<'PY'
import os
import signal
import subprocess
import sys

seconds = float(sys.argv[1])
process = subprocess.Popen(sys.argv[2:], start_new_session=True)
try:
    code = process.wait(timeout=seconds)
except subprocess.TimeoutExpired:
    for sig in (signal.SIGTERM, signal.SIGKILL):
        try:
            os.killpg(process.pid, sig)
        except ProcessLookupError:
            pass
        if sig == signal.SIGTERM:
            try:
                process.wait(timeout=1)
            except subprocess.TimeoutExpired:
                pass
    process.wait()
    print(f'Command timed out after {seconds:g}s: {sys.argv[2]}', file=sys.stderr)
    sys.exit(124)
sys.exit(code if code >= 0 else 128 - code)
PY
}
