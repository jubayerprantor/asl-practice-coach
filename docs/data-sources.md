# Public Dataset Sources & Licenses

Rule 9: Every dataset used for analysis, threshold derivation, or evaluation must have its source URL and license documented here before use.

| Dataset Name (Slug) | Source URL | License | Subject Count | Directory Layout & Notes |
| :--- | :--- | :--- | :--- | :--- |
| `asl-alphabet` | https://www.kaggle.com/datasets/grassknoted/asl-alphabet | CC0: Public Domain | Unknown (single/few signers; no subject IDs in filenames) | Flat class folders: `/data-raw/asl-alphabet/<LETTER>/*.jpg`. High frame redundancy; deduplication required. |
| `massey-asl` | https://www.massey.ac.nz/~albarrac/ (Massey University Gesture Dataset) | Research / Educational Use | 5 subjects (`Subject1`–`Subject5`) | Subject-prefixed filenames (`hand1_a_bot_seg_1_cropped.jpeg`) or `/data-raw/massey-asl/<SUBJECT>/<LETTER>/*`. Supports leave-one-subject-out testing. |
