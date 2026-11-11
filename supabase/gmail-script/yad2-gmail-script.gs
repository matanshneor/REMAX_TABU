// RE/MAX טאבו נכסים: שלושה תפקידים, מהתיבה הזו.
//   1. כל שעה: שולח ל-CRM את התראות יד 2 (המודעות נכנסות למאגר).
//   2. כל 5 דקות: כשסוכן חדש נרשם ומחכה לאישור, שולח מייל למנהל.
//   3. כל דקה: כשמישהו פונה דרך אתר הנכסים, שולח מייל למנהל (השרת ב-Railway לא יכול לשלוח מייל בעצמו).
// התקנה: בוחרים למעלה את הפונקציה install ולוחצים "הפעלה" (Run). פעם אחת בלבד.

const CRM_URL = 'https://ydelaanmjjxpvlplrsmm.supabase.co/functions/v1/yad2-email-intake';
const LEADS_URL = 'https://ydelaanmjjxpvlplrsmm.supabase.co/functions/v1/website-lead-emails';
const CRM_KEY = '<המפתח נמסר בנפרד, לא נשמר בקוד>';
const DONE_LABEL = 'נקלט ל-CRM';
// התראות יד 2 מ-30 הימים האחרונים שעוד לא נשלחו.
const QUERY = '(from:yad2 OR from:dueto.io OR yad2) newer_than:30d -label:"' + DONE_LABEL + '"';

/** פעם אחת: מריץ את שני התפקידים עכשיו, וקובע להם ריצה אוטומטית. */
function install() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sendYad2Emails').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('emailSignups').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('emailLeads').timeBased().everyMinutes(1).create();
  sendYad2Emails();
  emailSignups();
  emailLeads();
  Logger.log('הותקן. התראות יד 2 נשלחות ל-CRM כל שעה, מייל על סוכן חדש תוך 5 דקות, ומייל על פנייה מהאתר תוך דקה.');
}

/** שולח קריאה ל-CRM ומחזיר את התשובה. */
function callCrm(payload, url) {
  const res = UrlFetchApp.fetch(url || CRM_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-intake-key': CRM_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error('ה-CRM לא ענה כמו שצריך: ' + res.getContentText());
  return JSON.parse(res.getContentText());
}

/** הפרטים נכתבו ע״י מי שנרשם: מוצגים כטקסט ולא כקוד. */
function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** מייל למנהל על כל סוכן חדש שנרשם ומחכה לאישור (פעם אחת לכל סוכן). */
function emailSignups() {
  const signups = callCrm({ action: 'signups' }).signups || [];
  const sent = [];
  signups.forEach(function (s) {
    MailApp.sendEmail({
      to: s.to,
      subject: s.subject,
      name: 'RE/MAX טאבו נכסים CRM',
      htmlBody:
        '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px">' +
        '<p><b>סוכן חדש נרשם ל-CRM ומחכה לאישור שלך.</b></p>' +
        '<p>' + escapeHtml(s.details) + '</p>' +
        '<p><a href="' + s.link + '">לאישור הסוכן, בעמוד ״ניהול סוכנים״</a></p>' +
        '</div>',
    });
    sent.push(s.id);
  });
  if (sent.length) callCrm({ action: 'signups-sent', ids: sent });
  Logger.log('נשלחו ' + sent.length + ' מיילים על סוכנים חדשים.');
}

/** מייל למנהל על כל פנייה חדשה מאתר הנכסים (פעם אחת לכל פנייה). */
function emailLeads() {
  const leads = callCrm({ action: 'leads' }, LEADS_URL).leads || [];
  const sent = [];
  leads.forEach(function (l) {
    const wa = 'https://wa.me/972' + String(l.phone).replace(/\D/g, '').replace(/^0/, '');
    MailApp.sendEmail({
      to: l.to,
      subject: l.subject,
      name: 'RE/MAX טאבו נכסים CRM',
      htmlBody:
        '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5">' +
        '<p style="margin:0 0 4px"><b>' + escapeHtml(l.name) + '</b></p>' +
        '<p style="margin:0 0 12px"><a href="tel:' + escapeHtml(String(l.phone).replace(/\D/g, '')) + '">' + escapeHtml(l.phone) + '</a>' +
        ' · <a href="' + wa + '">וואטסאפ</a></p>' +
        (l.message ? '<p style="margin:0 0 12px;white-space:pre-line">' + escapeHtml(l.message) + '</p>' : '') +
        (l.property ? '<p style="margin:0 0 12px">נכס: ' +
          (l.propertyLink ? '<a href="' + escapeHtml(l.propertyLink) + '">' + escapeHtml(l.property) + '</a>' : escapeHtml(l.property)) + '</p>' : '') +
        '<p style="margin:16px 0 0"><a href="' + escapeHtml(l.crmLink) + '">לכרטיס הקונה ב-CRM</a></p>' +
        '</div>',
    });
    sent.push(l.id);
  });
  if (sent.length) callCrm({ action: 'leads-sent', ids: sent }, LEADS_URL);
  if (sent.length) Logger.log('נשלחו ' + sent.length + ' מיילים על פניות מהאתר.');
}

/** שולח ל-CRM כל התראה של יד 2 שעוד לא נשלחה, ומסמן אותה בתווית "נקלט ל-CRM". */
function sendYad2Emails() {
  const label = GmailApp.getUserLabelByName(DONE_LABEL) || GmailApp.createLabel(DONE_LABEL);
  const threads = GmailApp.search(QUERY, 0, 50);
  let sent = 0;
  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (m) {
      const res = UrlFetchApp.fetch(CRM_URL, {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-intake-key': CRM_KEY },
        payload: JSON.stringify({
          messageId: m.getId(),
          from: m.getFrom(),
          subject: m.getSubject(),
          date: m.getDate().toISOString(),
          html: m.getBody(),
        }),
        muteHttpExceptions: true,
      });
      if (res.getResponseCode() !== 200) throw new Error('ה-CRM לא קיבל את המייל: ' + res.getContentText());
      sent++;
    });
    thread.addLabel(label);
  });
  Logger.log('נשלחו ' + sent + ' מיילים ל-CRM.');
}
