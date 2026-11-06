#!/usr/bin/env bash
set -euo pipefail

scenario="${1:-baseline}"
root="$(cd "$(dirname "$0")/.." && pwd)"
properties="jmeter/scenarios/${scenario}.properties"

if [ ! -f "${root}/${properties}" ]; then
  echo "Unknown scenario: ${scenario} (use baseline, normal or stress)" >&2
  exit 1
fi

shift || true
cd "${root}"
rm -rf "results/${scenario}"
mkdir -p "results/${scenario}"

docker compose --profile test run --rm jmeter \
  -n \
  -t /work/jmeter/load-test.jmx \
  -q "/work/${properties}" \
  -l "/work/results/${scenario}/results.jtl" \
  -j "/work/results/${scenario}/jmeter.log" \
  -e -o "/work/results/${scenario}/report" \
  "$@"

echo "Report: results/${scenario}/report/index.html"
