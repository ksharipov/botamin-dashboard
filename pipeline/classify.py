"""
Rule-based classifier для диалогов Botamin.
Определяет step_reached (1-4) и cause для каждого диалога.
"""
import json
import re
from pathlib import Path

OUT_DIR = Path(__file__).parent

# Паттерны автоответчика в репликах user
AUTORESPONDER_PATTERNS = [
    r'ничего не забыли',
    r'готова записать',
    r'когда вам будет удобно разговаривать',
    r'по какому номеру с вами может связаться',
    r'во сколько вы будете готовы ответить',
    r'через какое время вы будете ждать',
    r'если вы сейчас смотрите на трубку',
    r'попробую научиться чему.нибудь новому',
    r'курсы по саморазвитию',
    r'научиться медитировать',
    r'опять эта пауза',
    r'что.то ещё\??\s*$',  # заканчивается на "Что-то ещё?"
    r'обстоятельства меняются.*что.то ещё',
    r'хотите что.нибудь добавить',
    r'не молчи',
    r'думаю.*у вас это получилось',
    r'вы пытались сказать что.то мысленно',
]

# Паттерны в боте — оффер рассказан (шаг 2)
BOT_OFFER_PATTERNS = [
    r'это лариса.*батамин',
    r'батамин.*ии.продавца',
    r'запускаем ии.продавца',
    r'прозванивает базу.*квалифицирует',
    r'у нас команда.*люди и.*агент',
]

# Паттерны — встреча назначена (шаг 3)
BOT_MEETING_PATTERNS = [
    r'записал[аи]? вас на',
    r'договорились.*[0-9]',
    r'отлично.*[0-9]+.*[чч]ас',
    r'зафиксировал[аи]? встречу',
]
USER_MEETING_CONFIRMED = [
    r'\b(хорошо|договорились|ок|окей|да|отлично|записывайте|давайте)\b',
]

# Паттерны — квалификация (шаг 4)
BOT_QUAL_PATTERNS = [
    r'сколько заявок',
    r'заявок в месяц',
    r'объём.*заявок',
    r'сколько лидов',
    r'сколько клиентов.*месяц',
]
USER_QUAL_ANSWERED = [
    r'\b\d+\b',  # клиент назвал число
    r'(больше|меньше|около|примерно)\s+\d+',
    r'(сотня|тысяч|несколько сотен)',
]

# Паттерны "занят" в репликах user
BUSY_PATTERNS = [
    r'не могу сейчас',
    r'занят',
    r'перезвоните',
    r'сейчас не время',
    r'на совещании',
    r'не до этого',
    r'в поездке',
    r'некогда',
    r'перезвони',
]

# Паттерны "не говорит с ботами"
NO_BOT_PATTERNS = [
    r'это бот',
    r'вы бот',
    r'ты бот',
    r'говорить с ботами',
    r'переключите на человека',
    r'живого человека',
    r'живой человек',
    r'не хочу говорить с роботом',
    r'с роботами не разговариваю',
]

# Паттерны "бот не понял" — бот сам признаёт проблему
BOT_CONFUSED_PATTERNS = [
    r'связь подвисает',
    r'плохо слышно',
    r'не расслышал',
    r'перезвоню вам позже',
    r'не слышу вас',
]


def match_any(text, patterns):
    t = text.lower()
    return any(re.search(p, t) for p in patterns)


def get_user_text(dialog):
    """Собрать все реплики пользователя."""
    parts = re.findall(r'user:\s*(.+?)(?=\nbot:|$)', dialog, re.DOTALL)
    return ' '.join(parts).lower()


def get_bot_text(dialog):
    """Собрать все реплики бота."""
    parts = re.findall(r'bot:\s*(.+?)(?=\nuser:|$)', dialog, re.DOTALL)
    return ' '.join(parts).lower()


def classify_one(dialog_text):
    """
    Возвращает (step_reached, cause, confidence).
    step_reached: 1-4
    cause: строка или None
    confidence: 0.0-1.0
    """
    if not dialog_text:
        return 1, "Другое", 0.5

    user_text = get_user_text(dialog_text)
    bot_text = get_bot_text(dialog_text)

    # --- Шаг 4: Квалификация ---
    # Бот спросил об объёме И клиент ответил числом
    if match_any(bot_text, BOT_QUAL_PATTERNS) and match_any(user_text, USER_QUAL_ANSWERED):
        return 4, None, 0.85

    # --- Шаг 3: Встреча назначена ---
    # Бот зафиксировал встречу
    if match_any(bot_text, BOT_MEETING_PATTERNS):
        return 3, None, 0.85

    # Бот предложил время + user согласился (только если оффер уже был)
    meeting_proposed = bool(re.search(
        r'(удобно созвониться|время.*сегодня.*завтра|записать.*вас|встрет)',
        bot_text
    ))
    user_confirmed = match_any(user_text, USER_MEETING_CONFIRMED)
    offer_given = match_any(bot_text, BOT_OFFER_PATTERNS)

    if offer_given and meeting_proposed and user_confirmed:
        # Проверим что user не автоответчик
        if not match_any(user_text, AUTORESPONDER_PATTERNS):
            return 3, None, 0.75

    # --- Шаг 2: Оффер рассказан ---
    if offer_given:
        # Определяем причину отвала

        # Автоответчик
        if match_any(user_text, AUTORESPONDER_PATTERNS):
            return 2, "Автоответчик", 0.85

        # Не говорит с ботами
        if match_any(user_text, NO_BOT_PATTERNS):
            return 2, "Не говорит с ботами", 0.90

        # Занят
        if match_any(user_text, BUSY_PATTERNS):
            return 2, "Занят", 0.85

        # Нецелевой — бот упомянул отрасль, клиент отрицает
        if re.search(r'(не наш|не моя|не занимаемся|нет такого|нету|не та отрасль)', user_text):
            return 2, "Нецелевой клиент", 0.80

        # Бот запутался / плохое качество
        if match_any(bot_text, BOT_CONFUSED_PATTERNS):
            return 2, "Бот не понял", 0.75

        # По умолчанию — оффер был, но не убедил
        return 2, "Не понял оффер", 0.60

    # --- Шаг 1: Только согласие ---

    # Автоответчик ещё на шаге 1
    if match_any(user_text, AUTORESPONDER_PATTERNS):
        return 1, "Автоответчик", 0.90

    # Не говорит с ботами
    if match_any(user_text, NO_BOT_PATTERNS):
        return 1, "Не говорит с ботами", 0.90

    # Занят
    if match_any(user_text, BUSY_PATTERNS):
        return 1, "Занят", 0.85

    # Бот не понял / плохая связь
    if match_any(bot_text, BOT_CONFUSED_PATTERNS):
        return 1, "Бот не понял", 0.80

    # По умолчанию — шаг 1
    return 1, "Другое", 0.55


def main():
    with open(OUT_DIR / 'to_classify.json', encoding='utf-8') as f:
        records = json.load(f)

    results = []
    stats = {1: 0, 2: 0, 3: 0, 4: 0}
    cause_counts = {}

    for rec in records:
        step, cause, conf = classify_one(rec.get('text', ''))
        stats[step] += 1
        if cause:
            cause_counts[cause] = cause_counts.get(cause, 0) + 1
        results.append({
            'id': rec['id'],
            'step_reached': step,
            'cause': cause,
            'cause_confidence': round(conf, 2)
        })

    with open(OUT_DIR / 'classified.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"Классифицировано: {len(results)}")
    print("\nРаспределение по шагам:")
    for s, c in stats.items():
        print(f"  Шаг {s}: {c} ({round(c/len(results)*100)}%)")
    print("\nПричины отвала:")
    for cause, cnt in sorted(cause_counts.items(), key=lambda x: -x[1]):
        print(f"  {cause}: {cnt}")

    print("\nclassified.json записан")


if __name__ == '__main__':
    main()
