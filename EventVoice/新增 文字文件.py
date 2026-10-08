import json
from pathlib import Path

# Python 程式所在目錄
folder = Path(__file__).resolve().parent

for file_path in folder.glob("*.json"):
    try:
        # 讀取 JSON
        with open(file_path, "r", encoding="utf-8-sig") as f:
            data = json.load(f)

        new_data = {}
        changed = False

        for s, value in data.items():
            # 只轉換 KEY
            new_s = s
            new_s = new_s.replace('人間さん先生', '人間さん')
            new_s = new_s.replace('人間さんさん', '人間さん')
            new_s = new_s.replace('人間さんさん', '人間さん')
            new_s = new_s.replace('人間さんさん', '人間さん')
            new_s = new_s.replace('\n', ' ')

            if new_s != s:
                changed = True

            new_data[new_s] = value

        # 只有發生變更才覆蓋原檔案
        if changed:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(new_data, f, ensure_ascii=False, indent=2)

            print(f"[已修改] {file_path.name}")
        else:
            print(f"[無變更] {file_path.name}")

    except Exception as e:
        print(f"[錯誤] {file_path.name}: {e}")

print("全部處理完成")