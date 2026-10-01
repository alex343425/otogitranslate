import json
from pathlib import Path

TARGET_KEY = "ポステリオル"

# Python 程式所在目錄
folder = Path(__file__).resolve().parent

json_files = list(folder.glob("*.json"))
total = len(json_files)

result = []

for i, json_file in enumerate(json_files, 1):
    try:
        with open(json_file, "r", encoding="utf-8-sig") as f:
            data = json.load(f)

        # 只檢查 JSON 最外層的 key
        if isinstance(data, dict) and TARGET_KEY in data:
            result.append(json_file.name)

    except Exception as e:
        print(f"\n讀取失敗：{json_file.name} -> {e}")

    # 顯示進度條
    bar_length = 30
    filled = int(bar_length * i / total) if total else bar_length
    bar = "█" * filled + "-" * (bar_length - filled)

    print(
        f"\r搜尋進度 [{bar}] {i}/{total}",
        end="",
        flush=True
    )

print()

# 寫入 result.txt
with open(folder / "result.txt", "w", encoding="utf-8") as f:
    for filename in result:
        f.write(filename + "\n")

print(f"完成，共搜尋 {total} 個 JSON，找到 {len(result)} 個符合檔案。")