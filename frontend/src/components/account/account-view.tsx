"use client";

import { useQueryClient } from "@tanstack/react-query";
import { KeyRoundIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { PageHeader } from "@/components/crm/page-header";
import { EntityForm } from "@/components/form/entity-form";
import type { FormSection } from "@/components/form/types";
import { useFormValues } from "@/components/form/use-form-values";
import { Button } from "@/components/ui/button";
import { useSaveRecord } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { USER_ROLE } from "@/lib/labels";

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
        <dl className="mb-5 grid grid-cols-3 gap-3 text-sm">
          <Info label="אימייל" value={<span dir="ltr">{profile.email}</span>} />
          <Info label="תפקיד" value={USER_ROLE[profile.role].label} />
          <Info label="הצטרפות" value={formatDate(profile.join_date)} />
        </dl>
        <EntityForm sections={PROFILE_SECTIONS} values={form.values} onChange={form.set} idPrefix="me" />
        <div className="mt-4 flex gap-2">
          <Button
            disabled={!form.dirty || save.isPending}
            onClick={() =>
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
            שמור פרטים
          </Button>
          {form.dirty && (
            <Button variant="ghost" onClick={form.reset}>
              בטל
            </Button>
          )}
        </div>
      </Card>

      <Card icon={<KeyRoundIcon />} title="שינוי סיסמה">
        <div className="max-w-sm">
          <SetPasswordForm currentPasswordFor={profile.email} submitLabel="עדכן סיסמה" onDone={() => toast.success("הסיסמה עודכנה")} />
        </div>
      </Card>
    </div>
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
