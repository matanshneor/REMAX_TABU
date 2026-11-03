// RE/MAX טאבו נכסים: שולח את התראות יד 2 מהתיבה הזו ל-CRM.
// התקנה: בוחרים למעלה את הפונקציה install ולוחצים "הפעלה" (Run). פעם אחת בלבד.

const CRM_URL = 'https://ydelaanmjjxpvlplrsmm.supabase.co/functions/v1/yad2-email-intake';
const CRM_KEY = '<המפתח נמסר בנפרד, לא נשמר בקוד>';
const DONE_LABEL = 'נקלט ל-CRM';
// התראות יד 2 מ-30 הימים האחרונים שעוד לא נשלחו.
const QUERY = '(from:yad2 OR from:dueto.io OR yad2) newer_than:30d -label:"' + DONE_LABEL + '"';

/** פעם אחת: שולח את מה שכבר יש, וקובע ריצה אוטומטית כל שעה. */
function install() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sendYad2Emails').timeBased().everyHours(1).create();
  sendYad2Emails();
  Logger.log('הותקן. מעכשיו ההתראות של יד 2 נשלחות ל-CRM כל שעה.');
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
