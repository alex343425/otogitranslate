"""將同目錄 JSON 的字串 value 用 OpenCC t2s 轉換，另存為 *_gb.json。

只處理本目錄，保留原始 JSON、所有 key 與非字串 value。
已是 *_gb.json 的檔案不作為來源；既有的 *_gb.json 輸出會覆寫。
相依套件：pip install opencc-python-reimplemented
執行方式：python convert_values_t2s.py
"""

import json
import os
import tempfile
from pathlib import Path

from opencc import OpenCC


def convert_values(value, converter):
    """遞迴轉換 value，dict 的 key 原樣保留。"""
    if isinstance(value, str):
        return converter.convert(value)
    if isinstance(value, dict):
        return {key: convert_values(item, converter) for key, item in value.items()}
    if isinstance(value, list):
        return [convert_values(item, converter) for item in value]
    return value


def unique_keys(pairs):
    """拒絕重複 key，避免 JSON 解析時遺失資料。"""
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate JSON key: {key!r}")
        result[key] = value
    return result


def main():
    directory = Path(__file__).resolve().parent
    sources = sorted(
        source for source in directory.glob("*.json")
        if source.is_file() and not source.stem.lower().endswith("_gb")
    )
    if not sources:
        print("No source JSON files; existing *_gb.json files are skipped.")
        return

    converter = OpenCC("t2s")
    plans = []
    # 所有來源都先讀取、解析及轉換成功，才開始另存輸出。
    for source in sources:
        target = source.with_name(f"{source.stem}_gb.json")
        if target.exists() and not target.is_file():
            raise IsADirectoryError(f"Output path is not a file: {target.name}")
        original = source.read_bytes()
        data = json.loads(original.decode("utf-8-sig"), object_pairs_hook=unique_keys)
        converted = convert_values(data, converter)
        text = json.dumps(converted, ensure_ascii=False, indent=2, allow_nan=False)
        newline = "\r\n" if b"\r\n" in original else "\n"
        text = text.replace("\n", newline) + newline
        encoding = "utf-8-sig" if original.startswith(b"\xef\xbb\xbf") else "utf-8"
        output = text.encode(encoding)
        if json.loads(output.decode("utf-8-sig")) != converted:
            raise ValueError(f"JSON round-trip validation failed: {source.name}")
        plans.append((source, target, original, output))

    with tempfile.TemporaryDirectory(prefix=".opencc_t2s_", dir=directory) as stage:
        staged = []
        for index, (source, target, original, output) in enumerate(plans):
            temporary = Path(stage) / f"{index}.json"
            temporary.write_bytes(output)
            staged.append(temporary)
        for source, target, original, output in plans:
            if source.read_bytes() != original:
                raise RuntimeError(f"Files changed during preparation: {source.name}")

        for temporary, (source, target, original, output) in zip(staged, plans):
            os.replace(temporary, target)
        for source, target, original, output in plans:
            if target.read_bytes() != output:
                raise RuntimeError(f"Output verification failed: {target.name}")
            if source.read_bytes() != original:
                raise RuntimeError(f"Source file changed: {source.name}")

    print(f"Converted and saved {len(plans)} *_gb.json files with OpenCC t2s.")
    print("Original JSON files, all keys and non-string values are preserved.")


if __name__ == "__main__":
    main()
