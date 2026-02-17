# prepare_yolo_dataset.py
import os
import shutil
import argparse
from pathlib import Path
from sklearn.model_selection import train_test_split
import yaml

def read_classes(classes_path):
    with open(classes_path, "r", encoding="utf-8") as f:
        names = [line.strip() for line in f if line.strip()]
    return names

def collect_image_files(images_dir, exts=None):
    exts = exts or [".jpg", ".jpeg", ".png", ".bmp", ".webp"]
    images = []
    for p in Path(images_dir).iterdir():
        if p.is_file() and p.suffix.lower() in exts:
            images.append(str(p))
    return sorted(images)

def ensure_dir(p):
    Path(p).mkdir(parents=True, exist_ok=True)

def copy_pairs(basenames, src_images_dir, src_labels_dir, dst_images_dir, dst_labels_dir):
    for name in basenames:
        # find the actual image filename for this basename (handles different extensions)
        matches = list(Path(src_images_dir).glob(f"{name}.*"))
        if not matches:
            print(f"[WARN] image for base '{name}' not found in {src_images_dir}. Skipping.")
            continue
        src_img = matches[0]
        dst_img = Path(dst_images_dir) / src_img.name
        shutil.copy2(src_img, dst_img)

        # copy label if exists; else create empty .txt
        src_label = Path(src_labels_dir) / f"{name}.txt"
        dst_label = Path(dst_labels_dir) / f"{name}.txt"
        if src_label.exists():
            shutil.copy2(src_label, dst_label)
        else:
            dst_label.write_text("", encoding="utf-8")

def main(args):
    # Paths relative to EcoClassifier root
    src_root = Path(args.source_root).resolve()  # e.g. "YOLO WITH IMAGES"
    images_dir = src_root / (args.images_dir)
    labels_dir = src_root / (args.labels_dir)
    classes_path = src_root / (args.classes)

    out_root = Path(args.out_dir).resolve()  # e.g. "datasets/ecoclassifier"

    # validate
    if not images_dir.exists():
        raise SystemExit(f"Images dir not found: {images_dir}")
    if not labels_dir.exists():
        raise SystemExit(f"Labels dir not found: {labels_dir}")
    if not classes_path.exists():
        raise SystemExit(f"Classes file not found: {classes_path}")

    names = read_classes(classes_path)
    print(f"Classes ({len(names)}): {names}")

    all_images = collect_image_files(images_dir)
    print(f"Found {len(all_images)} image files in {images_dir}")

    basenames = [Path(p).stem for p in all_images]
    basenames = list(dict.fromkeys(basenames))
    print(f"Unique basenames count: {len(basenames)}")

    # splits
    test_size = args.test_size
    val_size = args.val_size
    seed = args.seed

    trainval, test = train_test_split(basenames, test_size=test_size, random_state=seed, shuffle=True)
    val_relative = val_size / (1 - test_size) if (1 - test_size) > 0 else 0
    train, val = train_test_split(trainval, test_size=val_relative, random_state=seed, shuffle=True)

    print(f"Split counts -> train: {len(train)}, val: {len(val)}, test: {len(test)}")

    # create directories
    imgs_train = out_root / "images" / "train"
    imgs_val = out_root / "images" / "val"
    imgs_test = out_root / "images" / "test"
    labels_train = out_root / "labels" / "train"
    labels_val = out_root / "labels" / "val"
    labels_test = out_root / "labels" / "test"

    for d in [imgs_train, imgs_val, imgs_test, labels_train, labels_val, labels_test]:
        ensure_dir(d)

    # copy
    print("Copying train files...")
    copy_pairs(train, images_dir, labels_dir, imgs_train, labels_train)
    print("Copying val files...")
    copy_pairs(val, images_dir, labels_dir, imgs_val, labels_val)
    print("Copying test files...")
    copy_pairs(test, images_dir, labels_dir, imgs_test, labels_test)

    # write data.yaml with absolute paths (YOLOv8 prefers absolute or relative paths)
    data_yaml = {
        "train": str(imgs_train),
        "val": str(imgs_val),
        "test": str(imgs_test),
        "nc": len(names),
        "names": names
    }
    yaml_path = out_root / "data.yaml"
    with open(yaml_path, "w", encoding="utf-8") as f:
        yaml.dump(data_yaml, f, sort_keys=False)
    print(f"Written data.yaml -> {yaml_path}")

    print("Done. Summary:")
    print(f"Dataset root: {out_root}")
    print(f"Train images: {len(list(imgs_train.glob('*')))}")
    print(f"Val images:   {len(list(imgs_val.glob('*')))}")
    print(f"Test images:  {len(list(imgs_test.glob('*')))}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Prepare YOLOv8 dataset split from exported YOLO folder.")
    parser.add_argument("--source-root", type=str, default="YOLO WITH IMAGES", help="Folder that contains images/, labels/, classes.txt")
    parser.add_argument("--images-dir", type=str, default="images", help="images folder name inside source-root")
    parser.add_argument("--labels-dir", type=str, default="labels", help="labels folder name inside source-root")
    parser.add_argument("--classes", type=str, default="classes.txt", help="classes file name inside source-root")
    parser.add_argument("--out-dir", type=str, default="datasets/ecoclassifier", help="Output dataset root (created)")
    parser.add_argument("--test-size", type=float, default=0.10, help="Proportion for test set (default 0.10)")
    parser.add_argument("--val-size", type=float, default=0.10, help="Proportion for validation set (default 0.10)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()
    main(args)
