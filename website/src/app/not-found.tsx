import Link from "next/link";
import { PageTransition } from "@/components/motion/page-transition";
import { buttonClass, Container } from "@/components/ui";

export default function NotFound() {
  return (
    <PageTransition>
    <Container className="py-32">
      <h1 className="accent-line type-title">העמוד לא נמצא</h1>
      <p className="mt-4 max-w-md text-lg text-ink-2">ייתכן שהקישור ישן, או שהנכס כבר נמכר.</p>
      <Link href="/#listings" className={buttonClass("red", "mt-10")}>
        לכל הנכסים
      </Link>
    </Container>
    </PageTransition>
  );
}
