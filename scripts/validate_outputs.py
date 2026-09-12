import base64
import json
import os
import sys


OUTPUT_DIR = "output"
METADATA_DIR = os.path.join(OUTPUT_DIR, "metadata")
ENHANCED_INTEL_ENFORCE = os.environ.get("ENHANCED_INTEL_ENFORCE", "0") == "1"


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
        if node.get("residential_relaxed", False) and (not node["exit_ip_confirmed"] or node["country"] == "OTHER"):
            raise ValueError("Relaxed residential node lacks confirmed country egress")
        intel = node.get("intel") or {}
        ip_api = intel.get("ip_api") or {}
        if ENHANCED_INTEL_ENFORCE and node.get("residential_relaxed", False) and (ip_api.get("proxy") or ip_api.get("hosting")):
            raise ValueError("Residential node has ip-api proxy/hosting evidence")
        if ENHANCED_INTEL_ENFORCE and node.get("residential_relaxed", False) and int(intel.get("fraud_score", -1)) >= 90:
            raise ValueError("Residential node has Scamalytics fraud score >= 90")
        tier = node.get("residential_tier", "C")
        score = int(node.get("residential_confidence", 0))
        if tier == "A" and score < 80:
            raise ValueError("Residential tier A has score below 80")
        if tier == "B" and not 65 <= score < 80:
            raise ValueError("Residential tier B score is outside 65..79")
    print(f"Validated {len(nodes)} nodes and generated subscription files.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Validation failed: {exc}", file=sys.stderr)
        sys.exit(1)
