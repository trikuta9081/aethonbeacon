import base64, os, re, sys

raw = os.environ["APPSTORE_API_KEY_P8"].strip().strip('"').strip("'")
# Convert literal escape sequences from copy/paste into real newlines.
raw = raw.replace("\\r\\n", "\n").replace("\\n", "\n").replace("\\r", "\r")

# Strip any BEGIN/END header lines, then all whitespace — leaves pure base64.
body = re.sub(r"-----BEGIN [^-]+-----", "", raw, flags=re.MULTILINE)
body = re.sub(r"-----END [^-]+-----", "", body, flags=re.MULTILINE)
body = re.sub(r"\s+", "", body)

if not body:
    print("ERROR: APPSTORE_API_KEY_P8 is empty after normalization.", file=sys.stderr)
    sys.exit(1)

# Pad and validate so we fail here with a clear message instead of later in xcodebuild.
padding = "=" * (-len(body) % 4)
try:
    base64.b64decode(body + padding, validate=True)
except Exception as exc:
    print("ERROR: APPSTORE_API_KEY_P8 is not valid base64 after normalization.", file=sys.stderr)
    print(f"Detail: {exc}", file=sys.stderr)
    sys.exit(1)

# Rewrap at 64 cols with proper PEM PRIVATE KEY header/footer.
out = ["-----BEGIN PRIVATE KEY-----"]
for i in range(0, len(body), 64):
    out.append(body[i:i+64])
out.append("-----END PRIVATE KEY-----")
sys.stdout.write("\n".join(out) + "\n")
