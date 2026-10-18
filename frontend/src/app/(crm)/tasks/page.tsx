import { Suspense } from "react";
import { TasksView } from "@/components/tasks/tasks-view";

// Content depends on the signed-in user and the URL, so it renders on the client.
export const instant = false;

export default function TasksPage() {
  return (
    <Suspense>
      <TasksView />
    </Suspense>
  );
}
