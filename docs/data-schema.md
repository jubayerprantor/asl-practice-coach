# Landmark Sample Schema (v1)

All processed public datasets and real-human test exports conform to this JSON schema. Raw images are never committed to the repository.

## File Structure (`/data/processed/<dataset>.json`)

```json
{
  "schemaVersion": "1.0.0",
  "dataset": "asl-alphabet-kaggle",
  "generatedAt": "2026-11-15T00:00:00.000Z",
  "hasSubjectIds": false,
  "totalImagesScanned": 78000,
  "totalAccepted": 61420,
  "totalDroppedNoHand": 11200,
  "totalDroppedDuplicate": 5380,
  "samples": [
    {
      "id": "asl-alphabet-kaggle:A:00001",
      "label": "A",
      "sourceDataset": "asl-alphabet-kaggle",
      "subjectId": null,
      "handedness": "Right",
      "confidence": 0.982,
      "landmarks": [
        { "x": 0.512, "y": 0.744, "z": -0.00001 }
      ]
    }
  ]
}
```

## Field Definitions

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Unique deterministic identifier (`<dataset>:<label>:<index>`). |
| `label` | `string` | Yes | Uppercase target sign label (e.g., `"A"`–`"Z"`). Non-letter classes like `space`/`del`/`nothing` are excluded during fingerspelling ingestion. |
| `sourceDataset` | `string` | Yes | Canonical slug matching `/docs/data-sources.md`. |
| `subjectId` | `string | null` | Yes | Anonymized signer/subject ID if provided by the dataset; `null` otherwise. |
| `handedness` | `"Left" | "Right" | "Unknown"` | Yes | MediaPipe handedness classification on the source image (unmirrored static image). |
| `confidence` | `number` | Yes | MediaPipe handedness/hand detection score in `[0, 1]`. |
| `landmarks` | `Array<{x, y, z}>` | Yes | Exactly 21 normalized 3D hand landmarks in MediaPipe index order (`0` = wrist, `4` = thumb tip, `8` = index tip, `12` = middle tip, `16` = ring tip, `20` = pinky tip). |
