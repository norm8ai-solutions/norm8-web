# Automation Opportunity Score

V2 is a comparative decision aid, not a scientific measurement.

- Each known criterion uses a 1–5 scale. `1` is a known weak result; `UNKNOWN` is represented by a null value.
- Unknown criteria do not receive an invented score. A dimension is calculated from its known criteria with their weights renormalized, while the breakdown records known criteria, unknown criteria and coverage.
- Missing knowledge always reduces the separate evidence confidence. Measured evidence contributes 1, estimated evidence 0.55 and unknown evidence 0.
- `riskManageability` is intentionally directional: 5 means a low-consequence or manageable failure mode; 1 means a dangerous or difficult-to-control failure mode.
- Strategic fit is not part of the Automation Opportunity Score.
- Each completed calculation stores the selected model id/version, the exact model config, criterion values and provenance, dimension breakdown, final score, confidence and timestamp in `scoreSnapshot`.
- Scoring models are versioned records. Create a new version instead of editing the config of a version already used.
