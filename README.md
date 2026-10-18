# CRM לסוכנות נדל"ן

מערכת פנימית לניהול נכסים, קונים, משימות, כספים ומועמדים. בעברית, מימין לשמאל, מחירים בשקלים.

| תיקייה | מה יש בה |
|---|---|
| `frontend/` | האתר עצמו: Next.js 16, Tailwind, shadcn/ui |
| `backend/` | שרת: FastAPI (ייצוא נתונים למנהל, משימה יומית של התראות) |
| `supabase/` | בסיס הנתונים: טבלאות, הרשאות (RLS), אחסון קבצים, ובדיקות הרשאות |

## 1. Supabase (בסיס הנתונים)

1. פותחים פרויקט ב-[supabase.com](https://supabase.com).
2. מריצים את הסקריפט `supabase/migrations/20261017000000_init_schema.sql`. יש שתי דרכים:
   - להדביק אותו ב-SQL Editor בממשק של Supabase.
   - להריץ `supabase link --project-ref <id>` ואחר כך `supabase db push`.
3. מריצים את `supabase/tests/rls_test.sql` ב-SQL Editor. אם בסוף מופיעה ההודעה `ALL RLS TESTS PASSED`, ההרשאות עובדות. הבדיקה לא משאירה נתונים בבסיס הנתונים.
4. ב-**Authentication → Sign In / Providers** מכבים את האפשרות "Allow new users to sign up". ככה רק מנהל יכול להוסיף סוכנים, דרך Invite user.
5. הופכים את עצמך למנהל, מ-SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'your@email.com';
   ```

### הוספת סוכן חדש

1. ב-Supabase נכנסים ל-**Authentication → Users**, ולוחצים על **Add user → Send invitation**.
2. מקלידים את האימייל של הסוכן.
3. הסוכן מקבל מייל, לוחץ על הקישור ומגיע למסך "ברוך הבא! בחר סיסמה".
4. הסוכן מעדכן בעצמו שם וטלפון במסך "החשבון שלי" (לחיצה על השם בתחתית התפריט).

כדי להפוך משתמש למנהל, מריצים ב-SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'agent@example.com';
```

### מחיקת נתוני הדוגמה

לכל רשומות הדוגמה יש מזהה שמתחיל ב-`dddddddd`. כדי למחוק את כולן, מריצים ב-SQL Editor:
```sql
delete from public.notifications where id::text like 'dddddddd%';
delete from public.financial_transactions where id::text like 'dddddddd%';
delete from public.tasks where id::text like 'dddddddd%';
delete from public.buyer_property_viewings where id::text like 'dddddddd%';
delete from public.buyers where id::text like 'dddddddd%';
delete from public.properties where id::text like 'dddddddd%';
delete from public.candidates where id::text like 'dddddddd%';
delete from auth.users where id::text like 'dddddddd%';   -- הסוכנים לדוגמה
```

## 2. הרצה מקומית

**שרת:**
```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env   # למלא SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY
.venv/bin/uvicorn app.main:app --reload --port 8000
```

**אתר:**
```bash
cd frontend
npm install
cp .env.example .env.local   # למלא את כתובת Supabase ואת ה-publishable key
npm run dev                  # http://localhost:3000
```

## 3. העלאה ל-Railway

המערכת רצה בפרויקט Railway בשם `remax-crm`, באזור אירופה (הולנד). כל שירות מחובר למאגר `matanshneor/remax-crm` ומתעדכן אוטומטית בכל דחיפה ל-`main`. ההגדרות נשמרות בשירות עצמו ב-Railway, ולא בקבצים בקוד.

| שירות | Root Directory | Start command | Healthcheck | משתני סביבה |
|---|---|---|---|---|
| frontend | `/frontend` | `npm run start -- -p $PORT` | `/login` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL` |
| backend | `/backend` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | `/health` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGINS` (כתובת ה-frontend) |
| daily-digest | `/backend` | `python -m app.jobs.daily_digest` · Cron `0 5 * * *` | — | כמו backend |

אחרי ההעלאה, ב-Supabase תחת **Authentication → URL Configuration**, משנים את ה-Site URL לכתובת של ה-frontend ב-Railway. בלי זה, הקישורים במיילים של "שכחתי סיסמה" ושל הזמנת סוכן יפנו ל-localhost.

המשימה היומית רצה כל יום ב-05:00 UTC (08:00 שעון ישראל בקיץ). היא יוצרת התראות על:
- בלעדיות שמסתיימת בשבוע הקרוב.
- מועדי פינוי בשבועיים הקרובים.
- משימות באיחור.

## חוקי ההרשאות (נאכפים בבסיס הנתונים)

- **מחיקה:** רק מנהל. סוכן יכול רק לשנות סטטוס, למשל ל"מוקפא" או "לא רלוונטי".
- **ייצוא:** רק מנהל, דרך `GET /export/{table}` בשרת. אי אפשר לחסום ייצוא בבסיס הנתונים עצמו, כי מי שיכול לראות מידע יכול גם להעתיק אותו.
- **קונים:** כל סוכן רואה ועורך רק את הקונים שלו. המנהל רואה את כולם, כולל לידים שלא שויכו, והוא היחיד שמשייך קונה לסוכן או מעביר קונה בין סוכנים. היסטוריית הצפיות מוסתרת באותה צורה.
- **קונה כפול:** הבדיקה לפי טלפון עובדת על כל המשרד. סוכן רואה רק איזה סוכן מטפל בקונה הקיים, בלי שם הקונה ופרטיו.
- **עסקאות:**
  - רק המנהל רושם עסקה שנסגרה: סוכן, כמה נכנס למשרד, ואחוז הסוכן. האחוז הקבוע של הסוכן מופיע אוטומטית.
  - כל עסקה יוצרת אוטומטית בהנהלת החשבונות הכנסה (כל העמלה) והוצאה ("תשלום לסוכן"). השתיים מתעדכנות ונמחקות יחד עם העסקה.
  - כל סוכן רואה ב"העסקאות שלי" רק את העסקאות שלו.
- **משימות:** רשימה אישית. כל אחד, כולל המנהל, רואה רק את המשימות שלו, ואי אפשר לתת משימה למישהו אחר.
- **נכסים:** כולם רואים ועורכים. נכס בבלעדיות ננעל: רק הסוכן המגייס והמנהל יכולים לערוך אותו. רק הם יכולים גם לשנות את הבלעדיות או את הסוכן המגייס.
- **פרטי המוכר (בעל הנכס):** כל הסוכנים רואים אותם בכל נכס. העריכה לפי אותו כלל של הנכס: בנכס רגיל כולם יכולים לערוך, ובנכס בבלעדיות רק הסוכן המגייס והמנהל.
- **כספים ומועמדים:** מנהל בלבד, כולל הקבצים המצורפים (קבלות וקורות חיים).
