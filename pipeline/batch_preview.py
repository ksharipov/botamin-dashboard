"""
Вспомогательный скрипт: выводит батч диалогов для классификации LLM.
Использование: python batch_preview.py <start> <end>

Выводит полный текст диалога — шаги воронки определяет LLM, не регэксп.
"""
import json, sys
from pathlib import Path

start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
end   = int(sys.argv[2]) if len(sys.argv) > 2 else start + 100

data = json.load(open(Path(__file__).parent / 'to_classify.json', encoding='utf-8'))

for rec in data[start:end]:
    print(f"=== id={rec['id']} ===")
    print(rec['text'])
    print()
