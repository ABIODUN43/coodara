import { Container } from "@/components/layouts/Container";

export function Footer() {
  return (
    <footer className="border-t py-16">
      <Container>
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-4 font-semibold">Company</h3>

            <ul className="space-y-2">
              <li>About</li>
              <li>Careers</li>
              <li>Blog</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">Product</h3>

            <ul className="space-y-2">
              <li>Features</li>
              <li>Pricing</li>
              <li>Docs</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">Resources</h3>

            <ul className="space-y-2">
              <li>GitHub</li>
              <li>API</li>
            </ul>
          </div>

          <div className="mt-12 border-t border-zinc-800 pt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-zinc-500">
              © 2026 Codara. All rights reserved.
            </p>

              <div className="flex gap-6 text-sm text-zinc-500">
                 <span>Privacy</span>
                 <span>Terms</span>
                 <span>Status</span>
                 <span>GitHub</span>
              </div>
          </div>
        </div>

      </Container>
    </footer>
  );
}