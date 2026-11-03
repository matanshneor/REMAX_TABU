// RE/MAX טאבו נכסים: שני תפקידים, מהתיבה הזו.
//   1. כל שעה: שולח ל-CRM את התראות יד 2 (המודעות נכנסות למאגר).
//   2. כל 5 דקות: כשסוכן חדש נרשם ומחכה לאישור, שולח מייל למנהל.
// התקנה: בוחרים למעלה את הפונקציה install ולוחצים "הפעלה" (Run). פעם אחת בלבד.

const CRM_URL = 'https://ydelaanmjjxpvlplrsmm.supabase.co/functions/v1/yad2-email-intake';
const CRM_KEY = '<המפתח נמסר בנפרד, לא נשמר בקוד>';
const DONE_LABEL = 'נקלט ל-CRM';
// התראות יד 2 מ-30 הימים האחרונים שעוד לא נשלחו.
const QUERY = '(from:yad2 OR from:dueto.io OR yad2) newer_than:30d -label:"' + DONE_LABEL + '"';

/** פעם אחת: מריץ את שני התפקידים עכשיו, וקובע להם ריצה אוטומטית. */
function install() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sendYad2Emails').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('emailSignups').timeBased().everyMinutes(5).create();
  sendYad2Emails();
  emailSignups();
  Logger.log('הותקן. התראות יד 2 נשלחות ל-CRM כל שעה, ומייל על סוכן חדש נשלח תוך 5 דקות.');
}

/** שולח קריאה ל-CRM ומחזיר את התשובה. */
function callCrm(payload) {
  const res = UrlFetchApp.fetch(CRM_URL, {
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
