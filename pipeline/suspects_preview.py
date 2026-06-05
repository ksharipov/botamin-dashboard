import json, re
from pathlib import Path

with open('classified.json', encoding='utf-8') as f:
    cl = json.load(f)
with open('to_classify.json', encoding='utf-8') as f:
    tc = {r['id']: r['text'] for r in json.load(f)}

suspects = []
for r in cl:
    if r['step_reached'] not in [1, 2]:
        continue
    text = tc.get(str(r['id']), '')
    user_replies = re.findall(r'user:\s*(.+?)(?=\nbot:|$)', text, re.DOTALL)
    user_replies = [u.strip() for u in user_replies if u.strip() and u.strip() != '...']
    if len(user_replies) >= 5:
        suspects.append({'id': r['id'], 'step': r['step_reached'], 'cause': r['cause'], 'replies': len(user_replies), 'text': text})

suspects.sort(key=lambda x: x['replies'], reverse=True)

out = []
for s in suspects:
    out.append(f"=== id={s['id']} | step={s['step']} | cause={s['cause']} | replies={s['replies']} ===")
    out.append(s['text'])
    out.append('')

with open('suspects_full.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))

print(f"Written {len(suspects)} records to suspects_full.txt")
