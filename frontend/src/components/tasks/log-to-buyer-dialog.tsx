"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";

/** A finished task linked to a buyer: what to ask about, or null when closed. */
export type FinishedBuyerTask = { buyerId: string; buyerName: string; taskTitle: string };

/**
 * After checking off a task linked to a buyer: "what happened?" goes straight into that buyer's
 * call log (יומן שיחות). Optional: "לא עכשיו" just closes it.
 */
export function LogToBuyerDialog({ task, onClose }: { task: FinishedBuyerTask | null; onClose: () => void }) {
  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">{task && <LogForm task={task} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

function LogForm({ task, onClose }: { task: FinishedBuyerTask; onClose: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const first = task.buyerName.split(" ")[0];

  const save = useMutation({
    mutationFn: async () => {
      const body = `${task.taskTitle}: ${text.trim()}`;
      const { error } = await createClient().from("buyer_notes").insert({ buyer_id: task.buyerId, body });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buyer_notes"] });
      // The buyers table shows the last call.
      qc.invalidateQueries({ queryKey: ["buyers", "list"] });
      toast.success(`נרשם ביומן השיחות של ${first}`);
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) save.mutate();
      }}
    >
      <DialogHeader>
        <DialogTitle className="text-xl font-normal">מה היה עם {first}?</DialogTitle>
        <DialogDescription>המשימה ״{task.taskTitle}״ בוצעה. מה שתכתבו יירשם ביומן השיחות של {task.buyerName}.</DialogDescription>
      </DialogHeader>
      <Textarea
        autoFocus
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="לדוגמה: מעוניין בדירת 4 חדרים, יחזור אליי אחרי שידבר עם אשתו"
        onKeyDown={(e) => {
          // Ctrl+Enter saves, like the call log.
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && text.trim()) save.mutate();
        }}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          לא עכשיו
        </Button>
        <Button type="submit" disabled={!text.trim() || save.isPending}>
          שמור ביומן
        </Button>
      </DialogFooter>
    </form>
  );
}
