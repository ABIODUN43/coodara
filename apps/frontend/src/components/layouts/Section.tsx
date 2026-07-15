import type { ReactNode } from "react";
import { Container } from "./Container";

interface SectionProps {
  children: ReactNode;
  id?: string;
}

export function Section({ children, id }: SectionProps) {
  return (
    <section id={id} className="py-24">
      <Container>{children}</Container>
    </section>
  );
}