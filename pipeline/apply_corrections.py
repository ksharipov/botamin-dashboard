"""
Apply systematic corrections to classified.json.
Fixes misclassifications found by manual review of 79 suspicious records.

Main errors fixed:
1. Real humans with bad connections classified as Автоответчик/бот → corrected step+cause
2. Dialogs where offer/meeting happened at END but truncated preview showed bad beginning
3. step 2 records where meeting was actually confirmed → step 3
4. step 2 records where offer was never actually delivered → step 1
"""

import json

CORRECTIONS = {
    # id: (new_step, new_cause)
    # --- meeting/qualification detected (step upgrades) ---
    13:  (4, None),           # meeting + qualification confirmed
    31:  (3, "Другое"),       # meeting confirmed
    94:  (3, "Против ботов"), # client said "Окей" to expert callback
    100: (3, "Занят / неудобно"), # "завтра в девять"
    136: (3, "Занят / неудобно"), # "пятого июня в тринадцать"

    # --- real humans misclassified as Автоответчик/бот (step 1→2) ---
    22:  (2, "Занят / неудобно"),
    29:  (2, "Занят / неудобно"),
    30:  (2, "Занят / неудобно"),
    33:  (2, "Занят / неудобно"),
    36:  (2, "Занят / неудобно"),
    37:  (2, "Занят / неудобно"),
    38:  (2, "Занят / неудобно"),
    39:  (2, "Занят / неудобно"),
    41:  (2, "Занят / неудобно"),
    44:  (2, "Занят / неудобно"),
    46:  (2, "Занят / неудобно"),
    47:  (2, "Занят / неудобно"),
    48:  (2, "Занят / неудобно"),
    49:  (2, "Занят / неудобно"),
    50:  (2, "Другое"),
    51:  (2, "Другое"),
    52:  (2, "Занят / неудобно"),
    53:  (2, "Занят / неудобно"),
    54:  (2, "Занят / неудобно"),
    58:  (2, "Занят / неудобно"),
    59:  (2, "Занят / неудобно"),
    60:  (2, "Занят / неудобно"),
    63:  (2, "Занят / неудобно"),
    64:  (2, "Другое"),
    72:  (2, "Занят / неудобно"),
    73:  (2, "Занят / неудобно"),
    79:  (2, "Занят / неудобно"),
    80:  (2, "Занят / неудобно"),
    85:  (2, "Занят / неудобно"),
    91:  (2, "Занят / неудобно"),
    92:  (2, "Занят / неудобно"),
    95:  (2, "Занят / неудобно"),
    101: (2, "Занят / неудобно"),  # "А можно подробнее?" → оффер → "Нужно посоветоваться"
    123: (2, "Занят / неудобно"),  # "Нужно время на подумать"
    134: (2, "Занят / неудобно"),  # "Любопытно. Продолжайте."
    142: (2, "Занят / неудобно"),  # "Пока не дам ответ. Подумаю."

    # --- cause-only fixes (step stays) ---
    391: (1, "Другое"),   # real human, offer never delivered, cause was wrong

    # --- step downgrade: offer was never delivered ---
    610: (1, "Молчание"), # bot went silent ("..."), offer never reached client
}

with open("classified.json", encoding="utf-8") as f:
    records = json.load(f)

changed = 0
for r in records:
    if r["id"] in CORRECTIONS:
        new_step, new_cause = CORRECTIONS[r["id"]]
        old_step = r["step_reached"]
        old_cause = r.get("cause")
        if old_step != new_step or old_cause != new_cause:
            print(f"id={r['id']:4d}: step {old_step}->{new_step}, cause {old_cause!r}->{new_cause!r}")
            r["step_reached"] = new_step
            r["cause"] = new_cause
            changed += 1

print(f"\nTotal corrected: {changed} records")

with open("classified.json", "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

print("classified.json updated.")
