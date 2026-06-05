import json, glob, os

batch_files = sorted(glob.glob('batch_*.json'))
print(f"Found {len(batch_files)} batch files: {batch_files}")

all_records = []
for f in batch_files:
    with open(f, encoding='utf-8') as fh:
        records = json.load(fh)
    all_records.extend(records)
    print(f"  {f}: {len(records)} records")

all_records.sort(key=lambda r: r['id'])
print(f"\nTotal records: {len(all_records)}")
print(f"ID range: {all_records[0]['id']} - {all_records[-1]['id']}")

ids = [r['id'] for r in all_records]
duplicates = [i for i in ids if ids.count(i) > 1]
if duplicates:
    print(f"WARNING: duplicate IDs: {set(duplicates)}")

with open('classified.json', 'w', encoding='utf-8') as fh:
    json.dump(all_records, fh, ensure_ascii=False, indent=2)

print(f"\nclassified.json written: {len(all_records)} records")
