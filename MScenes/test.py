import tkinter as tk
from tkinter import filedialog
import re
import os
from opencc import opencc
import json

converter = opencc.OpenCC('s2t')

def select_and_load_files():
    # 建立 Tkinter 主視窗（不顯示）
    root = tk.Tk()
    root.withdraw()

    # 使用檔案選擇器選擇多個 TXT 檔案
    file_paths = filedialog.askopenfilenames(
        title="選擇一個或多個 TXT 檔案",
        filetypes=[("Text Files", "*.txt"), ("All Files", "*.*")]
    )

    contents = []  # 用於儲存所有檔案的內容

    if file_paths:
        for file_path in file_paths:
            try:
                # 讀取檔案內容
                with open(file_path, 'r', encoding='utf-8') as file:
                    contents.append(file.read())
            except Exception as e:
                print(f"讀取檔案 {file_path} 時發生錯誤：{e}")
    else:
        print("未選擇任何檔案。")

    return contents


# 呼叫函數
text_list = select_and_load_files()
'''
def split_text_by_number(text):
    # 修改後的正則表達式，匹配任何數字開頭，後跟空格和'-'
    pattern = r'(\d+) - (.*?)(?=\d+ -|\Z)'  # 改為匹配每段的標題及內容
    matches = re.findall(pattern, text, re.DOTALL)

    # 將每個段落（標題 + 內容）儲存在 list 中
    sections = []
    for match in matches:
        title = match[0] + " - " + match[1].strip()  # 標題包含數字和文字
        sections.append(title)

    return sections'''

def split_text_by_number(text):
    # 匹配段落，從數字開頭的標題到下一個標題或文本結尾
    pattern = r'(\d+ - .+?)(?=\n\d+ - |\Z)'  # 匹配標題及其內容，直到下一個標題
    matches = re.findall(pattern, text, re.DOTALL)

    # 去除多餘空白和換行，並將段落存入列表
    sections = [match.strip() for match in matches]
    return sections

def find_txt_file(i):
    current_directory = os.getcwd()  # 取得當前目錄
    files = os.listdir(current_directory)  # 列出當前目錄下的所有檔案

    # 找到檔名包含 i 且以 .txt 結尾的第一個檔案
    for file in files:
        if i in file and file.endswith('.txt'):
            # 讀取並回傳檔案內容
            with open(file, 'r', encoding='utf-8') as f:
                return f.read()

    return None  # 如果沒有找到符合的檔案，返回 None
# 呼叫函數並顯示分段結果
def process_text(text):
    # 將字符串按行分割為列表
    lines = text.split('\n')
    
    while True:
        # 嘗試找到包含 "ストーリー用" 的行
        found = False
        for i, line in enumerate(lines):
            if 'ストーリー用' in line:
                found = True
                # 檢查是否為最後一行
                if i == len(lines) - 1:
                    # 如果是最後一行，只刪除當前行
                    lines.pop(i)
                else:
                    # 刪除當前行和下一行
                    lines.pop(i + 1)
                    lines.pop(i)
                break  # 跳出 for 循環重新開始
        if not found:
            break  # 如果沒有找到 "ストーリー用"，退出 while 循環

    # 將處理後的行重新拼接成字符串
    return '\n'.join(lines)

def colon_replace(text):
    text = text.replace('」','')
    text = text.replace('「','：')
    text = text.replace(':','：')
    return text

for i in range(len(text_list)):
    text_list[i] = process_text(text_list[i])
    
    
for text in text_list:
    sections = split_text_by_number(text)
    new_sections = []
    link = False
    l=[]
    for x in sections:
        if link:
            new_sections[-1]+='\n'+x
            link = False        
        else:
            new_sections.append(x)        
        if x.count('\n') <= 1: #等一下要接在後面
            link = True                 
    for x in new_sections:
        story_id = x.split('-')[0].strip()
        #txt_files = find_txt_file(str(story_id))
        #y = txt_files.splitlines()
        
        x = x.splitlines()
        con_list={}
        con_list_gb={}
        i=0
        while i < (len(x)):
            if i == 0:
                i+=2
                continue
            if '(背景切換...)' in x[i] or 'changed' in x[i]:
                i+=2
                continue            
            
            if '：' in x[i]:
                con_list_gb[ x[i].split('：')[1].strip() ] = colon_replace(x[i+1]).split('：')[1].strip()
                if x[i].split('：')[0].strip() not in con_list_gb:
                    con_list_gb[ x[i].split('：')[0].strip() ] = colon_replace(x[i+1]).split('：')[0].strip()
            elif '（' in x[i]:
                con_list_gb[ x[i][1:-1] ] = colon_replace(x[i+1])[1:-1]
            else:
                print('error',x[i+1],x[i])
            x[i+1] = converter.convert(x[i+1])
            if '：' in x[i]:
                con_list[ x[i].split('：')[1].strip() ] = colon_replace(x[i+1]).split('：')[1].strip()
                if x[i].split('：')[0].strip() not in con_list:
                    con_list[ x[i].split('：')[0].strip() ] = colon_replace(x[i+1]).split('：')[0].strip()
            elif '（' in x[i]:
                con_list[ x[i][1:-1] ] = colon_replace(x[i+1])[1:-1]
            else:
                print('error',x[i+1],x[i])
            i+=2
        filename = str(story_id)
    
        # 將字典轉換成 JSON 格式的字串，並指定 UTF-8 編碼
        json_string = json.dumps(con_list, ensure_ascii=False)
        # 將 JSON 字串寫入檔案，指定 UTF-8 編碼
        with open(filename+'.json', "w", encoding="utf-8") as f:
            f.write(json_string)
        json_string = json.dumps(con_list_gb, ensure_ascii=False)
        with open(filename+'_gb.json', "w", encoding="utf-8") as f:
            f.write(json_string)
            