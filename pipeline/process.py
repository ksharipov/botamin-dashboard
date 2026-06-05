import pandas as pd
import json
import re
import math
import os, sys
from datetime import datetime, timedelta
from pathlib import Path

XLSX_PATH = os.getenv('XLSX_PATH') or (sys.argv[1] if len(sys.argv) > 1 else 'calls.xlsx')
OUT_DIR = Path(__file__).parent
CLASSIFIED_PATH = OUT_DIR / "classified.json"
DATA_JSON_PATH = Path(__file__).parent.parent / "public" / "data.json"

TECH_REASONS = {'no_answer', 'elevenlabs_hangup', 'hangup', 'queue_timeout',
                'network_error', 'bad_number', 'no_user_speech', 'bad_number',
                'answering_machine'}

CAUSES_LIST = [
    "Занят", "Нецелевой клиент", "Не понял оффер",
    "Не говорит с ботами", "Бот не понял", "Автоответчик", "Другое"
]


def parse_duration(s):
    if pd.isna(s):
        return 0
    s = str(s).strip()
    m = re.match(r'(\d+):(\d+)', s)
    if m:
        return int(m.group(1)) * 60 + int(m.group(2))
    return 0


def detect_variant(dialog):
    if pd.isna(dialog):
        return 'A'
    first_bot = re.search(r'bot:\s*(.{0,60})', str(dialog))
    if first_bot and 'Алло' in first_bot.group(1):
        return 'B'
    return 'A'


def count_user_replies(dialog):
    if pd.isna(dialog):
        return 0
    return len(re.findall(r'user:', str(dialog)))


def load_df():
    df = pd.read_excel(XLSX_PATH, engine='openpyxl')
    df.columns = ['phone', 'datetime', 'duration_str', 'status', 'audio_url', 'reason', 'dialog']
    df['id'] = df.index.astype(str)
    df['duration_sec'] = df['duration_str'].apply(parse_duration)

    # pandas читает дату как Timestamp напрямую
    def parse_dt(v):
        if pd.isna(v):
            return None
        try:
            return v.to_pydatetime()
        except Exception:
            try:
                return datetime(1899, 12, 30) + timedelta(days=float(v))
            except Exception:
                return None

    df['dt'] = df['datetime'].apply(parse_dt)
    df['date'] = df['dt'].apply(lambda x: x.strftime('%Y-%m-%d') if x else None)
    df['hour'] = df['dt'].apply(lambda x: x.hour if x else None)

    # Флаги
    df['is_empty'] = df['dialog'].isna() | (df['dialog'].astype(str).str.strip() == '')
    df['is_tech'] = df['reason'].isin(TECH_REASONS)
    df['no_user'] = ~df['dialog'].astype(str).str.contains('user:', na=False)
    df['user_reply_count'] = df['dialog'].apply(count_user_replies)
    df['script_variant'] = df['dialog'].apply(detect_variant)

    # Что нужно классифицировать LLM
    df['needs_llm'] = (
        (df['duration_sec'] >= 30) &
        ~df['is_empty'] &
        ~df['is_tech'] &
        ~df['no_user']
    )

    # Правило для коротких/без-диалога звонков
    df['step_reached'] = 0
    df.loc[~df['no_user'] & (df['duration_sec'] < 30), 'step_reached'] = 1
    df.loc[df['no_user'] & ~df['is_empty'] & ~df['is_tech'], 'step_reached'] = 1

    df['cause'] = None
    df['cause_confidence'] = None

    return df


def save_to_classify(df):
    to_classify = df[df['needs_llm']][['id', 'dialog']].copy()
    records = to_classify.rename(columns={'dialog': 'text'}).to_dict('records')
    with open(OUT_DIR / 'to_classify.json', 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"Записано в to_classify.json: {len(records)} диалогов")
    return records


def merge_classified(df):
    if not CLASSIFIED_PATH.exists():
        print("classified.json не найден, пропускаем LLM-данные")
        return df

    with open(CLASSIFIED_PATH, encoding='utf-8') as f:
        classified = json.load(f)

    cl_map = {str(c['id']): c for c in classified}
    for idx, row in df[df['needs_llm']].iterrows():
        c = cl_map.get(str(row['id']))
        if c:
            df.at[idx, 'step_reached'] = c.get('step_reached', 1)
            df.at[idx, 'cause'] = c.get('cause')
            df.at[idx, 'cause_confidence'] = c.get('cause_confidence', 0.8)

    return df


def compute_health(df):
    dates = sorted(df['date'].dropna().unique())
    today = dates[-1] if dates else None
    week_dates = dates[:-1] if len(dates) > 1 else dates

    def rates_for_dates(d_list):
        sub = df[df['date'].isin(d_list)]
        total = len(sub)
        if total == 0:
            return {'qualification_rate': 0, 'tech_failure_rate': 0, 'no_dialog_rate': 0}
        qual = len(sub[sub['step_reached'] == 4]) / total
        tech = len(sub[sub['is_tech']]) / total
        no_dialog = len(sub[sub['is_empty'] | (sub['no_user'] & sub['reason'].eq('client_hangup'))]) / total
        return {
            'qualification_rate': round(qual, 4),
            'tech_failure_rate': round(tech, 4),
            'no_dialog_rate': round(no_dialog, 4)
        }

    today_rates = rates_for_dates([today]) if today else {}
    week_rates = rates_for_dates(week_dates) if week_dates else today_rates

    return {'today': today_rates, 'week_avg': week_rates}


def compute_funnel(df):
    total = len(df)
    steps = []
    prev_count = total
    for step in [1, 2, 3, 4]:
        names = {1: 'Согласие', 2: 'Оффер', 3: 'Встреча', 4: 'Квалификация'}
        count = len(df[df['step_reached'] >= step])
        from_start = round(count / total, 4) if total else 0
        from_prev = round(count / prev_count, 4) if prev_count else 0
        steps.append({
            'step': step,
            'name': names[step],
            'count': count,
            'from_start': from_start,
            'from_prev': from_prev if step > 1 else None
        })
        prev_count = count
    return steps


def compute_funnel_by_day(df):
    result = []
    for date in sorted(df['date'].dropna().unique()):
        sub = df[df['date'] == date]
        total = len(sub)
        day_steps = []
        prev = total
        for step in [1, 2, 3, 4]:
            count = len(sub[sub['step_reached'] >= step])
            from_prev = round(count / prev, 4) if prev else 0
            from_start = round(count / total, 4) if total else 0
            day_steps.append({
                'step': step,
                'count': count,
                'from_start': from_start,
                'from_prev': from_prev if step > 1 else None
            })
            prev = count
        result.append({'date': date, 'steps': day_steps})
    return result


def compute_causes(df):
    # По шагу
    by_step = []
    for step in [1, 2, 3, 4]:
        sub = df[(df['step_reached'] == step) & df['cause'].notna()]
        counts = sub['cause'].value_counts().to_dict()
        causes = [{'name': k, 'count': v} for k, v in counts.items()]
        by_step.append({'step': step, 'causes': causes})

    # Глобальные (по всем шагам)
    all_causes = df[df['cause'].notna()]['cause'].unique()
    total_by_step = {s: len(df[df['step_reached'] == s]) for s in [1, 2, 3, 4]}
    total_all = []
    for cause in CAUSES_LIST:
        row = {'name': cause}
        total_count = 0
        for step in [1, 2, 3, 4]:
            sub = df[(df['step_reached'] == step) & (df['cause'] == cause)]
            cnt = len(sub)
            denom = total_by_step[step] or 1
            row[f's{step}'] = round(cnt / denom, 4)
            total_count += cnt
        row['total'] = total_count
        if total_count > 0:
            total_all.append(row)

    total_all.sort(key=lambda x: x['total'], reverse=True)
    return by_step, total_all


def compute_engagement(df, step=None, cause=None):
    sub = df
    if step:
        sub = sub[sub['step_reached'] == step]
    if cause:
        sub = sub[sub['cause'] == cause]
    buckets = {'0': 0, '1': 0, '2': 0, '3+': 0}
    for _, row in sub.iterrows():
        n = row['user_reply_count']
        if n == 0:
            buckets['0'] += 1
        elif n == 1:
            buckets['1'] += 1
        elif n == 2:
            buckets['2'] += 1
        else:
            buckets['3+'] += 1
    total = sum(buckets.values()) or 1
    return [{'label': k, 'count': v, 'pct': round(v / total, 4)}
            for k, v in buckets.items()]


def compute_ab_tests(df):
    tests = []
    from scipy import stats

    variants = df.groupby('script_variant')
    a = df[df['script_variant'] == 'A']
    b = df[df['script_variant'] == 'B']

    if len(a) == 0 or len(b) == 0:
        return tests

    def variant_data(sub, label, name):
        total = len(sub)
        step_rates = []
        prev = total
        for step in [1, 2, 3, 4]:
            cnt = len(sub[sub['step_reached'] >= step])
            step_rates.append(round(cnt / prev, 4) if prev else 0)
            prev = cnt
        qual = len(sub[sub['step_reached'] == 4]) / total if total else 0
        return {
            'name': name, 'label': label, 'count': total,
            'steps': step_rates,
            'qualification': round(qual, 4)
        }

    va = variant_data(a, 'Звоню насчёт ИИ', 'Вариант А')
    vb = variant_data(b, 'Алло, хочу поработать', 'Вариант Б')

    # p-value для квалификации (z-test для пропорций)
    n_a, n_b = len(a), len(b)
    q_a = len(a[a['step_reached'] == 4])
    q_b = len(b[b['step_reached'] == 4])
    p_a, p_b = q_a / n_a, q_b / n_b
    p_pool = (q_a + q_b) / (n_a + n_b)
    se = math.sqrt(p_pool * (1 - p_pool) * (1 / n_a + 1 / n_b)) or 0.0001
    z = (p_b - p_a) / se
    p_value = max(2 * (1 - stats.norm.cdf(abs(z))), 1e-10)

    # 95% CI
    se_diff = math.sqrt(p_a * (1 - p_a) / n_a + p_b * (1 - p_b) / n_b)
    diff = p_b - p_a
    ci_low = diff - 1.96 * se_diff
    ci_high = diff + 1.96 * se_diff

    tests.append({
        'name': 'Скрипт открытия',
        'variants': [va, vb],
        'p_value': round(p_value, 4),
        'ci_low': round(ci_low, 4),
        'ci_high': round(ci_high, 4),
        'significant': p_value < 0.05
    })
    return tests


def compute_recommendations(df, funnel_steps, ab_tests):
    recs = []

    # Правило 1: Самый высокий drop-off — всегда генерируем рекомендацию
    worst_step = None
    worst_rate = 1.0
    for s in funnel_steps[1:]:
        if s['from_prev'] is not None and s['from_prev'] < worst_rate:
            worst_rate = s['from_prev']
            worst_step = s

    if worst_step:
        sub = df[df['step_reached'] == worst_step['step']]
        if len(sub) > 0:
            silent_pct = len(sub[sub['user_reply_count'] <= 1]) / len(sub)
            engaged_pct = len(sub[sub['user_reply_count'] >= 3]) / len(sub)

            if silent_pct > 0.35:
                # Клиент молчит → монолог слишком длинный
                recs.append({
                    'title': f"Сократить монолог бота на шаге «{worst_step['name']}»",
                    'evidence': f"{round(silent_pct*100)}% клиентов не успевают сказать слова до сброса. Конверсия шага: {round(worst_rate*100, 1)}%",
                    'hypothesis': "Длинный монолог без пауз не даёт клиенту вступить в диалог",
                    'test': f"Вариант А (текущий) vs Вариант Б (монолог бота -{30}% на шаге «{worst_step['name']}»)",
                    'expected': f"+8-12% конверсии шага «{worst_step['name']}»"
                })
            else:
                # Клиент участвует, но не убеждается → проблема содержания
                top_cause = None
                step_causes = df[(df['step_reached'] == worst_step['step']) & df['cause'].notna()]['cause'].value_counts()
                if len(step_causes) > 0:
                    top_cause = step_causes.index[0]

                recs.append({
                    'title': f"Пересмотреть содержание оффера на шаге «{worst_step['name']}»",
                    'evidence': f"{round(engaged_pct*100)}% клиентов активно участвуют в диалоге (3+ реплики), но конверсия всего {round(worst_rate*100, 1)}%. Главная причина: «{top_cause or 'см. причины'}»",
                    'hypothesis': "Клиент слушает, но аргументы не убеждают — нужно менять содержание, не формат",
                    'test': f"Вариант А (текущий оффер) vs Вариант Б (новые аргументы на шаге «{worst_step['name']}»)",
                    'expected': f"+10-15% конверсии шага «{worst_step['name']}»"
                })

    # Правило 2: Есть звонки с причиной "Занят"
    busy_sub = df[df['cause'] == 'Занят']
    if len(busy_sub) >= 5:
        hour_col = df['hour'].dropna()
        if len(hour_col) > 0:
            morning = df[df['hour'].between(8, 12)]
            afternoon = df[df['hour'].between(13, 18)]
            m_busy = len(morning[morning['cause'] == 'Занят'])
            a_busy = len(afternoon[afternoon['cause'] == 'Занят'])
            peak = "утром (8-12)" if m_busy >= a_busy else "после обеда (13-18)"
            recs.append({
                'title': "Протестировать другое время звонков",
                'evidence': f"{len(busy_sub)} клиентов завершили звонок по причине «Занят». Пик отвала: {peak}",
                'hypothesis': "Часть клиентов недоступна именно в это время — смена окна повысит контакт",
                'test': "Сегмент А — звонки 9-12, Сегмент Б — звонки 14-18 (по 500+ звонков каждый)",
                'expected': "-20-30% отвала по причине «Занят»"
            })

    # Правило 3: A/B тест — вариант Б лучше на шаге 1 но хуже на шаге 2
    if ab_tests:
        test = ab_tests[0]
        if len(test['variants']) >= 2:
            va, vb = test['variants'][0], test['variants'][1]
            s1_a = va['steps'][0] if va['steps'] else 0
            s1_b = vb['steps'][0] if vb['steps'] else 0
            s2_a = va['steps'][1] if len(va['steps']) > 1 else 0
            s2_b = vb['steps'][1] if len(vb['steps']) > 1 else 0
            if s1_b > s1_a and s2_b < s2_a:
                recs.append({
                    'title': "Скомбинировать приветствие Б с оффером А",
                    'evidence': f"«{vb['label']}» лучше на шаге 1 (+{round((s1_b-s1_a)*100)}%), но хуже на шаге 2 ({round((s2_b-s2_a)*100)}%)",
                    'hypothesis': "«Алло» создаёт лучший контакт, но оффер варианта А убедительнее",
                    'test': "Вариант В = приветствие «Алло» + оффер из варианта А",
                    'expected': "+5-8% итоговой квалификации"
                })
            elif vb['qualification'] > va['qualification']:
                recs.append({
                    'title': f"Масштабировать вариант Б («{vb['label']}»)",
                    'evidence': f"Вариант Б показывает квалификацию {round(vb['qualification']*100, 1)}% vs {round(va['qualification']*100, 1)}% у варианта А. p-value={test['p_value']:.3f}",
                    'hypothesis': "Более персональное приветствие повышает доверие и итоговую конверсию",
                    'test': "Увеличить долю трафика на вариант Б с 5% до 30%, собрать 2000+ звонков",
                    'expected': f"+{round((vb['qualification']-va['qualification'])*100, 1)}% квалификации при масштабировании"
                })

    return recs


def mask_phone(phone):
    digits = re.sub(r'\D', '', str(phone))
    if len(digits) < 7:
        return '***'
    masked = digits[:3] + '*' * (len(digits) - 7) + digits[-4:]
    return masked


def build_calls(df, max_calls=2000):
    sub = df[~df['is_empty'] & ~df['is_tech']].head(max_calls)
    records = []
    for _, row in sub.iterrows():
        records.append({
            'id': str(row['id']),
            'phone': mask_phone(row['phone']) if not pd.isna(row['phone']) else '***',
            'date': str(row['date']) if row['date'] else '',
            'hour': int(row['hour']) if row['hour'] is not None else None,
            'duration_sec': int(row['duration_sec']),
            'reason': str(row['reason']) if not pd.isna(row['reason']) else '',
            'script_variant': str(row['script_variant']),
            'step_reached': int(row['step_reached']),
            'cause': str(row['cause']) if row['cause'] and not pd.isna(row['cause']) else None,
            'cause_confidence': float(row['cause_confidence']) if row['cause_confidence'] and not pd.isna(row['cause_confidence']) else None,
            'dialog': str(row['dialog']) if not pd.isna(row['dialog']) else '',
            'audio_url': str(row['audio_url']) if not pd.isna(row['audio_url']) else ''
        })
    return records


def main():
    print("Читаем XLSX...")
    df = load_df()
    print(f"Загружено: {len(df)} строк")
    print(f"Требуют LLM: {df['needs_llm'].sum()}")
    print(f"Технические сбои: {df['is_tech'].sum()}")
    print(f"Пустые диалоги: {df['is_empty'].sum()}")

    # Шаг 1: сохраняем to_classify.json
    save_to_classify(df)

    # Шаг 2: подгружаем classified.json если есть
    df = merge_classified(df)

    # Шаг 3: агрегация
    print("Считаем агрегаты...")
    health = compute_health(df)
    funnel_steps = compute_funnel(df)
    funnel_by_day = compute_funnel_by_day(df)
    causes_by_step, causes_total = compute_causes(df)

    # Engagement по каждому шагу
    engagement_by_step = {}
    for step in [1, 2, 3, 4]:
        engagement_by_step[str(step)] = compute_engagement(df, step=step)

    try:
        ab_tests = compute_ab_tests(df)
    except ImportError:
        print("scipy не установлен, A/B тест без p-value")
        ab_tests = []

    recommendations = compute_recommendations(df, funnel_steps, ab_tests)
    calls = build_calls(df)

    dates = sorted(df['date'].dropna().unique())
    data = {
        'meta': {
            'total': len(df),
            'date_from': dates[0] if dates else '',
            'date_to': dates[-1] if dates else '',
            'dates': list(dates)
        },
        'health': health,
        'funnel_steps': funnel_steps,
        'funnel_by_day': funnel_by_day,
        'causes_by_step': causes_by_step,
        'causes_total': causes_total,
        'engagement_by_step': engagement_by_step,
        'ab_tests': ab_tests,
        'recommendations': recommendations,
        'calls': calls
    }

    import numpy as np

    class NpEncoder(json.JSONEncoder):
        def default(self, obj):
            if isinstance(obj, np.integer):
                return int(obj)
            if isinstance(obj, np.floating):
                return float(obj)
            if isinstance(obj, np.bool_):
                return bool(obj)
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            return super().default(obj)

    DATA_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2, cls=NpEncoder)

    print(f"\ndata.json записан: {DATA_JSON_PATH}")
    print(f"Воронка: {[s['count'] for s in funnel_steps]}")
    print(f"A/B тестов: {len(ab_tests)}")
    print(f"Рекомендаций: {len(recommendations)}")
    print(f"Звонков в calls[]: {len(calls)}")


if __name__ == '__main__':
    main()
