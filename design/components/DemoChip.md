# DemoChip

`app/src/components/ui/DemoChip.tsx`. The visible "Demo" label required for `origin: synthetic` (DATA_POLICY).
Alluvium (coastal clay) outline and text on a fine diagonal hatch, so it never reads as a severity status.
Contrast 7.53:1 light, 9.50:1 dark. The hint ("Datos de ejemplo" / "Example data") is the tooltip and is read by
screen readers.

Where it goes: the Home header next to the farm name, the ReplayScrubber, and the header action of any Card that
shows synthetic values. Do not hide it in demo screenshots or in the video.
Removed in critique: a `withHint` variant that printed "Demo datos de ejemplo" inline. It read as a broken sentence.
