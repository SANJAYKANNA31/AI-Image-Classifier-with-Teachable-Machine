"""Classify one image with a Teachable Machine TensorFlow/Keras image model."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


def load_labels(labels_path: Path) -> list[str]:
    """Read class names from a Teachable Machine labels.txt file."""
    labels = []
    for line in labels_path.read_text(encoding="utf-8-sig").splitlines():
        label = re.sub(r"^\s*\d+\s+", "", line).strip()
        if label:
            labels.append(label)
    if not labels:
        raise ValueError(f"No class names found in labels file: {labels_path}")
    return labels


def classify_image(image_path: Path, model_path: Path, labels_path: Path) -> int:
    """Load a Keras model, classify an image, and print ranked predictions."""
    missing_files = [
        path for path in (image_path, model_path, labels_path) if not path.is_file()
    ]
    if missing_files:
        raise FileNotFoundError(
            "File not found: " + ", ".join(str(path) for path in missing_files)
        )

    try:
        import numpy as np
        from PIL import Image, ImageOps
        from tensorflow import keras
    except ImportError as error:
        raise RuntimeError(
            "Required packages are missing. Install them with: "
            "py -m pip install -r requirements.txt"
        ) from error

    labels = load_labels(labels_path)
    model = keras.models.load_model(model_path, compile=False)

    input_shape = model.input_shape
    if isinstance(input_shape, list) or len(input_shape) != 4:
        raise ValueError("Expected a single-image model with a four-dimensional input.")
    height, width, channels = input_shape[1:]
    if height is None or width is None or channels != 3:
        raise ValueError(f"Unsupported model input shape: {input_shape}")

    with Image.open(image_path) as source:
        image = ImageOps.fit(
            source.convert("RGB"),
            (int(width), int(height)),
            method=Image.Resampling.LANCZOS,
        )
        image_array = np.asarray(image, dtype=np.float32)

    # Teachable Machine's Keras image models expect RGB pixels scaled to [-1, 1].
    image_batch = np.expand_dims((image_array / 127.5) - 1.0, axis=0)
    scores = np.asarray(model.predict(image_batch, verbose=0))
    if scores.ndim != 2 or scores.shape[0] != 1:
        raise ValueError(f"Unexpected model output shape: {scores.shape}")
    scores = scores[0]
    if len(scores) != len(labels):
        raise ValueError(
            f"The model returned {len(scores)} predictions, "
            f"but {labels_path} contains {len(labels)} labels."
        )
    if not np.isfinite(scores).all():
        raise ValueError("The model returned a non-finite prediction score.")

    ranked_predictions = sorted(
        zip(labels, scores), key=lambda prediction: prediction[1], reverse=True
    )
    best_label, best_score = ranked_predictions[0]
    print(f"Image: {image_path}")
    print(f"Best match: {best_label} ({best_score:.1%} confidence)")
    print("\nAll classes:")
    for label, score in ranked_predictions:
        print(f"  {label}: {score:.1%}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Classify an image with a Teachable Machine Keras model."
    )
    parser.add_argument("image", type=Path, help="Path to a JPG, PNG, or other Pillow-readable image")
    parser.add_argument(
        "--model",
        type=Path,
        default=Path("keras_model.h5"),
        help="Path to the exported keras_model.h5 (default: ./keras_model.h5)",
    )
    parser.add_argument(
        "--labels",
        type=Path,
        default=Path("labels.txt"),
        help="Path to the exported labels.txt (default: ./labels.txt)",
    )
    args = parser.parse_args()

    try:
        return classify_image(args.image, args.model, args.labels)
    except (FileNotFoundError, OSError, RuntimeError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
