"""
Вспомогательный скрипт: выводит батч диалогов для классификации в сессии.
Использование: python batch_preview.py <start> <end>
"""
import json, sys, re
from pathlib import Path

start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
end   = int(sys.argv[2]) if len(sys.argv) > 2 else start + 100

data = json.load(open(Path(__file__).parent / 'to_classify.json', encoding='utf-8'))

for rec in data[start:end]:
    rid = rec['id']
    txt = rec['text']
    user_parts = re.findall(r'user:\s*(.+?)(?=\nbot:|$)', txt, re.DOTALL)
    user_text = ' / '.join(p.strip()[:90] for p in user_parts if p.strip() and p.strip() != '...')
    has_offer   = 'батамин' in txt.lower() or ('кейс' in txt.lower() and 'показать' in txt.lower())
    has_meeting = any(w in txt.lower() for w in ['запишу вас', 'записал вас', 'зафиксировал', 'до встречи', 'буду ждать'])
    has_qual    = any(w in txt.lower() for w in ['сколько заявок', 'заявок в месяц', 'сколько лидов', 'сколько контактов'])
    flags = ('OFF' if has_offer else '') + ('|MTG' if has_meeting else '') + ('|QUAL' if has_qual else '')
    print(f'#{rid}|{flags}| {user_text[:130]}')
