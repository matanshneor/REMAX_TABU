"use client";

import { buttonClass, Container } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <Container className="py-32">
      <h1 className="accent-line font-serif text-4xl font-light">משהו השתבש בטעינת העמוד</h1>
      <p className="mt-4 max-w-md text-lg text-ink-2">אפשר לנסות שוב בעוד רגע.</p>
      <button type="button" onClick={reset} className={buttonClass("red", "mt-10")}>
        לנסות שוב
      </button>
    </Container>
  );
}
