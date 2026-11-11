"use client";

import { useQueryClient } from "@tanstack/react-query";
import { GlobeIcon, KeyRoundIcon, UserIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { PageHeader } from "@/components/crm/page-header";
import { EntityForm } from "@/components/form/entity-form";
import type { FormSection } from "@/components/form/types";
import { useFormValues } from "@/components/form/use-form-values";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, useSaveRecord, useTeam } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { USER_ROLE } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";

const PROFILE_SECTIONS: FormSection[] = [
  {
    fields: [
      { name: "full_name", label: "שם מלא", type: "text", required: true },
      { name: "phone", label: "טלפון", type: "tel" },
    ],
  },
];

export function AccountView() {
  const { profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const form = useFormValues(PROFILE_SECTIONS, profile, `${profile?.id}:${profile?.updated_at}`);
  const save = useSaveRecord("profiles");
  if (!profile) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="החשבון שלי" />

      <Card icon={<UserIcon />} title="פרטים אישיים">
        <dl className="mb-5 grid gap-3 text-sm sm:grid-cols-3">
          <Info label="אימייל" value={<span dir="ltr">{profile.email}</span>} />
          <Info label="תפקיד" value={USER_ROLE[profile.role].label} />
          <Info label="הצטרפות" value={formatDate(profile.join_date)} />
        </dl>
        <EntityForm sections={PROFILE_SECTIONS} values={form.values} onChange={form.set} idPrefix="me" />
        <div className="mt-4 flex gap-2">
          <Button
            disabled={!form.dirty || save.isPending}
            onClick={() =>
              form.validate() &&
              save.mutate(
                { id: profile.id, values: form.changes },
                // The signed-in profile lives in AuthProvider; the agents list is the shared cache.
                {
                  onSuccess: () => {
                    refreshProfile();
                    qc.invalidateQueries({ queryKey: ["profiles"] });
                  },
                },
              )
            }
          >
            שמירת פרטים
          </Button>
          {form.dirty && (
            <Button variant="ghost" onClick={form.reset}>
              ביטול
            </Button>
          )}
        </div>
      </Card>

      <WebsiteBio profileId={profile.id} />

      <Card icon={<KeyRoundIcon />} title="שינוי סיסמה">
        <div className="max-w-sm">
          <SetPasswordForm currentPasswordFor={profile.email} submitLabel="עדכן סיסמה" onDone={() => toast.success("הסיסמה עודכנה")} />
        </div>
      </Card>
    </div>
  );
}

const BIO_MAX = 600;

/** The few words about the agent on the public site ("המשרד שלנו"); each agent writes their own. */
function WebsiteBio({ profileId }: { profileId: string }) {
  const { data: team } = useTeam();
  const qc = useQueryClient();
  const mine = team?.find((t) => t.profile_id === profileId);
  const saved = mine?.website_bio ?? "";
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (!mine) return null;
  const text = draft ?? saved;
  const dirty = text.trim() !== saved.trim();

  async function save() {
    setSaving(true);
    const { error } = await createClient().rpc("set_my_website_bio", { p_bio: text });
    setSaving(false);
    if (error) return toast.error(errorMessage(error));
    await qc.invalidateQueries({ queryKey: ["office_agents"] });
    setDraft(null);
    toast.success("הטקסט נשמר ויופיע באתר");
  }

  return (
    <Card icon={<GlobeIcon />} title="כמה מילים עליי באתר">
      <p className="mb-3 text-sm text-muted-foreground">
        הטקסט מופיע ליד השם והתמונה שלך בעמוד ״המשרד שלנו״ באתר. שתיים־שלוש שורות מספיקות. אם השדה ריק, לא מופיע טקסט.
      </p>
      <Textarea
        aria-label="כמה מילים עליי באתר"
        rows={4}
        maxLength={BIO_MAX}
        value={text}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="mt-4 flex items-center gap-2">
        <Button disabled={!dirty || saving} onClick={save}>
          שמירה
        </Button>
        {dirty && (
          <Button variant="ghost" onClick={() => setDraft(null)}>
            ביטול
          </Button>
        )}
        <span className="ms-auto text-xs tabular-nums text-muted-foreground">
          {text.length}/{BIO_MAX}
        </span>
      </div>
    </Card>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-xl border bg-card p-6">
      <h2 className="mb-5 flex items-center gap-2 font-semibold [&_svg]:size-4.5 [&_svg]:text-muted-foreground">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
