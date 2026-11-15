---
name: reading-sources-without-poppler
description: How to read scanned PDF sources here (no pdftoppm) and which source URLs work for FAO-56 and Saaty
metadata:
  type: reference
---

- The Read tool cannot render PDFs (no poppler). WebFetch saves the PDF; scanned PDFs (1-bit FlateDecode page images)
  can be decoded with zlib + numpy and written as PNG with rasterio, then viewed with Read. Copy the PDF to its own temp
  folder and run the script with `python -I` from another folder (untrusted download).
- FAO-56 moved: use https://www.fao.org/4/x0490e/x0490e0b.htm (ch. 6, Table 12) and .../x0490e08.htm (Example 18);
  the /3/ URLs redirect to a 404.
- Saaty 1990 EJOR 48:9-26 readable copy: vpp.sbuf.se ("How to make decision AHP.pdf"), Tables 2-3 on pp. 15-16; it has no
  RI table (RI 0.58 for n=3 and 1.41 for n=8 follow from its printed CI/CR). The SPEC's isahp-org URL does not resolve.

Related: [[engine-calibration-and-evidence]]
