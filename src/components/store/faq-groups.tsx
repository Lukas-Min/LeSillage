import { SectionCard } from "@/components/ui/section";
import { FAQ_GROUPS, type FaqAnswer } from "@/lib/faq-copy";

function FaqAnswerBody({ answer }: { answer: FaqAnswer }) {
  if (typeof answer === "string") {
    return <p className="mt-1 text-sm text-muted-foreground">{answer}</p>;
  }
  return (
    <div className="mt-1 space-y-2 text-sm text-muted-foreground">
      {answer.lead ? <p>{answer.lead}</p> : null}
      <ul className="list-disc space-y-1 pl-4">
        {answer.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      {answer.note ? <p>{answer.note}</p> : null}
    </div>
  );
}

// Shared by faq/page.tsx and faq/loading.tsx — the FAQ page has no DB fetch,
// so its loading state is the same static content rendered up front, not a
// skeleton (see CLAUDE.md's loading-state rules).
export function FaqGroupList() {
  return (
    <>
      {FAQ_GROUPS.map((group) => (
        <SectionCard
          key={group.id}
          eyebrow={group.title}
          actions={
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/35 bg-[color-mix(in_oklch,var(--cream),var(--gold)_8%)] text-gold">
              <group.icon className="h-4 w-4" />
            </span>
          }
        >
          <div className="space-y-4">
            {group.items.map((item, index) => (
              <div key={item.q} className={index > 0 ? "border-t border-border/60 pt-4" : ""}>
                <p className="font-serif-display text-base leading-tight">{item.q}</p>
                <FaqAnswerBody answer={item.a} />
              </div>
            ))}
          </div>
        </SectionCard>
      ))}
    </>
  );
}
