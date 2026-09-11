import base64
import json
import os
import sys


OUTPUT_DIR = "output"
METADATA_DIR = os.path.join(OUTPUT_DIR, "metadata")


def ensure_base64_subscription(path):
    with open(path, "r", encoding="utf-8") as handle:
        content = handle.read().strip()
    if not content:
        return
    decoded = base64.b64decode(content + "=" * (-len(content) % 4)).decode("utf-8")
    if not all("://" in line for line in decoded.splitlines() if line.strip()):
        raise ValueError(f"Invalid subscription payload: {path}")


def main():
    required = [
        os.path.join(OUTPUT_DIR, "v2ray.txt"),
        os.path.join(OUTPUT_DIR, "clash.yaml"),
        os.path.join(OUTPUT_DIR, "singbox.json"),
        os.path.join(METADATA_DIR, "nodes.json"),
        os.path.join(METADATA_DIR, "summary.json"),
    ]
    missing = [path for path in required if not os.path.exists(path)]
    if missing:
        raise FileNotFoundError("Missing generated files: " + ", ".join(missing))

    ensure_base64_subscription(os.path.join(OUTPUT_DIR, "v2ray.txt"))
    with open(os.path.join(METADATA_DIR, "nodes.json"), "r", encoding="utf-8") as handle:
        nodes = json.load(handle)
    for node in nodes:
        if node["residential"] and not node["exit_ip_confirmed"]:
            raise ValueError("Residential node lacks confirmed egress IP")
        if node["country"] != "OTHER" and not node["exit_ip_confirmed"]:
            raise ValueError("Country-classified node lacks confirmed egress IP")
    print(f"Validated {len(nodes)} nodes and generated subscription files.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Validation failed: {exc}", file=sys.stderr)
        sys.exit(1)
