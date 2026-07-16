import { Section } from "@/components/layouts/Section";

const faqs = [
  {
    question: "Is my code private?",
    answer:
      "Yes. Codara is designed with security first. Repository access is limited to authorized analysis, and private repositories remain private.",
  },
  {
    question: "Does Codara support private GitHub repositories?",
    answer:
      "Yes. Codara supports both public and private repositories through GitHub OAuth.",
  },
  {
    question: "Does Codara support monorepos?",
    answer:
      "Yes. Codara is built to understand modern monorepo architectures, including frontend, backend, and service boundaries.",
  },
  {
    question: "How does GitHub authentication work?",
    answer:
      "Authentication is handled through GitHub OAuth. Codara never stores your GitHub password.",
  },
  {
    question: "Will there be a free tier?",
    answer:
      "Yes. Codara will offer a generous free tier for students, individual developers, and small teams.",
  },
  {
    question: "Can teams use Codara together?",
    answer:
      "Yes. Organizations, shared repositories, and collaborative architecture reviews are part of Codara's roadmap.",
  },
];

export function FAQ() {
  return (
    <Section>
      <div className="mb-16 text-center">
        <p className="mb-3 text-sm uppercase tracking-widest text-zinc-500">
          Frequently Asked Questions
        </p>

        <h2 className="text-5xl font-bold">
          Questions? We've Got Answers.
        </h2>

        <p className="mx-auto mt-6 max-w-3xl text-lg text-zinc-400">
          Everything you need to know about Codara and how it works.
        </p>
      </div>

      <div className="mx-auto max-w-4xl space-y-4">
        {faqs.map((faq) => (
          <div
            key={faq.question}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
          >
            <h3 className="mb-3 text-xl font-semibold">
              {faq.question}
            </h3>

            <p className="text-zinc-400">
              {faq.answer}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}