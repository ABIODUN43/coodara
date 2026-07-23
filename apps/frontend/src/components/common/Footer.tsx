import { Logo } from "@/components/common/Logo";

const COLUMNS = [
  { title: "Product", links: ["Features", "Pricing", "Enterprise"] },
  { title: "Resources", links: ["Blog", "Documentation", "API"] },
  { title: "Company", links: ["About", "Careers", "Contact"] },
  { title: "Legal", links: ["Privacy", "Terms"] },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-8 px-4  py-16 sm:px-8 md:grid-cols-4">
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="mb-4 font-bold text-slate-900">{column.title}</p>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-slate-500 transition-all duration-[600ms] hover:text-slate-900">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-center gap-1 border-t border-slate-200/30 px-4 py-6 sm:flex-row sm:justify-between sm:px-8">
        <div className="flex items-center justify-center sm:justify-start">
          <div className="sm:origin-left scale-60">
            <Logo />
          </div>
        </div>
        <p className="text-sm text-slate-500">© {currentYear} Coodara Intelligence Inc.</p>
      </div>
    </footer>
  );
}