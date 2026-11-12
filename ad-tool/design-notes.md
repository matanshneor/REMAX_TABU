# Ad tool — design notes

Copied from the old `Remax-Template` project (now archived). The tool itself lives in `frontend/public/index.html`. Note: agents are no longer in `agents.js`; they come from the CRM team list (see [README.md](README.md)).

---

# RE/MAX טאבו נכסים — תבנית מודעות

## מטרת הפרויקט
כלי ליצירת מודעות נדל"ן עבור סוכני **RE/MAX טאבו נכסים**.
הכלי חייב להיות פשוט וידידותי לחלוטין — המשתמשים אינם טכנולוגיים.

## הקובץ הראשי
`index.html` — קובץ HTML יחיד, נפתח בדפדפן ישירות (Chrome/Safari).

### זרימת עבודה
1. לחיצה כפולה על `index.html`
2. בחירת סוכן (כרטיסים בשלב 1, או "כל הסוכנים" — חלון עם חיפוש)
3. לחיצה על ריבועי התמונה (בטופס או במודעה עצמה) → בחירת תמונות נכס מהמחשב
4. מילוי שדות: סוג נכס / פרטים / מחיר (אפשר מספר בלבד — פסיקים ו״ש״ח״ מתווספים במודעה)
5. לחיצה "הורד מודעה" → PNG מורד אוטומטית ונפתח חלון "המודעה מוכנה" (בטלפון: שיתוף)

### ממשק העריכה (אוקטובר 2026)
- רקע בהיר, טופס ב-4 כרטיסים ממוספרים, שלבים בכותרת, תצוגה מקדימה צמודה בצד.
- מתחת ל-900px: עריכה ותצוגה מתחלפות (כפתור "תצוגה" בסרגל התחתון).
- המודעה (`#ad-canvas`) מוקטנת בתצוגה רק עם transform — הייצוא תמיד ב-540px. עיצוב המודעה לא השתנה.

### פתיחה מה-CRM (נובמבר 2026)
כפתור "יצירת מודעה" בכרטיס נכס ב-CRM פותח את הכלי עם הפרטים אחרי ה-`#`:
`type`, `location`, `sub`, `info`, `price`, `agent` (טלפון — הסוכן נבחר לפי 9 הספרות האחרונות) ו-`img` (עד 3 כתובות תמונה, לפי הסדר).
`loadFromLink()` ממלא את הטופס, מוחק את ה-`#` מהכתובת ושומר כטיוטה — רענון הדף ממשיך מהטיוטה.

## עיצוב — נעול, אל תשנה ללא אישור
| פרמטר | ערך |
|--------|------|
| צבע NAVY | `#1B3564` |
| צבע RED | `#CC0000` |
| פונט | Arial / Manrope |
| כיוון | RTL (עברית) |
| רוחב מודעה | 520px (מוצג × 2 ב-PNG) |

## קבצים בפרויקט
| קובץ | תפקיד |
|------|--------|
| `index.html` | **הכלי הראשי** |
| `agents.js` | רשימת הסוכנים — ניתן לערוך בעורך טקסט רגיל |
| `agent-photos.js` | עותק מוטמע של תמונות הסוכנים — **נוצר אוטומטית**, לא לערוך ידנית |
| `update_agent_photos.py` | מייצר מחדש את `agent-photos.js` מתיקיית `images/` |
| `images/` | תמונות כל הסוכנים + לוגו + אייקוני מסך הבית (`apple-touch-icon.png`, `icon-192.png`) |

## סוכנים קיימים (agents.js)
| שם | רישיון | טלפון | קובץ תמונה |
|----|---------|--------|------------|
| משה שניאור | 3181402 | 052-8110611 | Moshe_Shneor_image.png |
| לימור מרקו | 312109174 | 053-3453961 | Limor_Marco_image.png |
| מרים שפנגנטל | 31034580 | 054-8366822 | Miriam_Shpangental_image.png |
| הדס אהרון | 3166785 | 050-7690054 | Hadas_Aharon_image.png |
| יהודית זקן | 311106208 | 052-8249515 | Yehudit_Zaken_image.png |
| אפרת לוי | 3151288 | 050-4443830 | Efrat_Levi_image.png |
| מאיר מאור אקריש | 31927075 | 050-6999596 | Meir_Maor_Akrish_image.png |
| אברהם קטרי | 3204910 | 058-7551878 | Avraham_Katri_image.png |
| רחל מלכא | 31929675 | 055-6697474 | Rachel_Malka_image.png |

## הוספת סוכן חדש

### 1. הכנת התמונה
```bash
# הסרת רקע (Python, דורש rembg)
python3 -c "
from rembg import remove
from PIL import Image
import io, numpy as np

with open('original.jpg', 'rb') as f:
    result = remove(f.read())

img = Image.open(io.BytesIO(result)).convert('RGBA')
arr = np.array(img)
alpha = arr[:,:,3]
rows = np.where(alpha.max(axis=1) > 10)[0]
cols = np.where(alpha.max(axis=0) > 10)[0]

# חיתוך צמוד לדמות + שוליים קטנים
pad = 20
crop = img.crop((cols[0]-pad, rows[0]-pad, cols[-1]+pad, rows[-1]+pad))
pw, ph = crop.size
scale = 800 / ph
resized = crop.resize((int(pw*scale), 800), Image.LANCZOS)

canvas = Image.new('RGBA', (800, 800), (0,0,0,0))
canvas.paste(resized, ((800-resized.width)//2, 0))
canvas.save('images/Agent_Name_image.png')
"
```

### 2. עיבוד נוסף אם נדרש
- **הגדלה**: שנה scale ב-`img.resize()`
- **מרכוז**: חשב מרכז הדמות והזז לנקודה (400, 400) בתמונה 800×800
- **כלל הזהב**: הדמות צריכה להיות ממורכזת, לא לחרוג מגבולות 800×800

### 3. עדכון agents.js
```javascript
{
  name:    "שם הסוכן",
  role:    "סוכן/ת נדל\"ן",
  license: "מספר רישיון",
  phone:   "05X-XXXXXXX",
  photo:   "images/Agent_Name_image.png"
}
```

### 4. עדכון agent-photos.js — חובה!
```bash
python3 update_agent_photos.py
```
בלי זה, כשפותחים את `index.html` בלחיצה כפולה, יצירת ה-PNG נכשלת עם השגיאה
"Tainted canvases may not be exported" — הדפדפן חוסם ציור של קובץ תמונה מקומי.
`agent-photos.js` מכיל את התמונות כ-base64 (WebP) ולכן הדפדפן מתייחס אליהן כחלק מהדף.

## פרטי תצוגת תמונת הסוכן
- גודל עיגול בתצוגה: **104×104px** (עם border-radius: 50%)
- תמונות מאוחסנות כ-PNG עם רקע שקוף (**RGBA**)
- גודל סטנדרטי: **800×800px**
- CSS: `object-fit: contain; object-position: center bottom`
- לוגו RE/MAX — מאוחסן ב-`images/Remax_Logo.png`
