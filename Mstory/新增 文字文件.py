import shutil
import os

def batch_copy_files():
    # 設定起始與結束的原始編號
    start_num = 10608
    end_num = 10617
    
    # 計算新舊編號的偏移量 (10638 - 10533 = 105)
    offset = 60
    
    # 取得目前的執行路徑
    current_dir = os.getcwd()
    
    print(f"開始處理檔案複製（目標路徑: {current_dir}）...")

    for i in range(start_num, end_num + 1):
        # 計算新的編號
        new_num = i + offset
        
        # 定義兩組檔案的名稱規則
        file_pairs = [
            (f"{i}.json", f"{new_num}.json"),
            (f"{i}_gb.json", f"{new_num}_gb.json")
        ]
        
        for old_name, new_name in file_pairs:
            # 檢查原始檔案是否存在
            if os.path.exists(old_name):
                try:
                    shutil.copy2(old_name, new_name)
                    print(f"成功: {old_name} -> {new_name}")
                except Exception as e:
                    print(f"錯誤: 複製 {old_name} 時發生問題: {e}")
            else:
                print(f"跳過: 找不到原始檔案 {old_name}")

    print("\n所有動作執行完畢。")

if __name__ == "__main__":
    batch_copy_files()