from flask import Flask, jsonify, send_file, abort
import os

app = Flask(__name__)

# 定義翻譯 JSON 文件的存放目錄
TRANSLATION_DIR = "./translations"
FONT_FILE_PATH = "./fonts/custom-font.ttf"

@app.route('/MAdults/<filename>.json', methods=['GET'])
def get_madults_translation(filename):
    # 構建 JSON 文件的路徑
    file_path = os.path.join(TRANSLATION_DIR, "MAdults", f"{filename}.json")
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as file:
            data = file.read()
        return jsonify(data)
    else:
        abort(404, description=f"Translation file {filename}.json not found")

@app.route('/MScenes/<filename>.json', methods=['GET'])
def get_mscenes_translation(filename):
    # 構建 JSON 文件的路徑
    file_path = os.path.join(TRANSLATION_DIR, "MScenes", f"{filename}.json")
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as file:
            data = file.read()
        return jsonify(data)
    else:
        abort(404, description=f"Translation file {filename}.json not found")

@app.route('/replace-font', methods=['GET'])
def replace_font():
    # 返回字體文件
    if os.path.exists(FONT_FILE_PATH):
        return send_file(FONT_FILE_PATH, mimetype='font/ttf')
    else:
        abort(404, description="Font file not found")

@app.errorhandler(404)
def resource_not_found(e):
    return jsonify(error=str(e)), 404

if __name__ == '__main__':
    # 確保所需的目錄存在
    os.makedirs(os.path.join(TRANSLATION_DIR, "MAdults"), exist_ok=True)
    os.makedirs(os.path.join(TRANSLATION_DIR, "MScenes"), exist_ok=True)
    os.makedirs("./fonts", exist_ok=True)
    # 啟動服務
    app.run(host="0.0.0.0", port=5000)
