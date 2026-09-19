import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layouts/Container";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "Enterprise", href: "#enterprise" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#docs" },
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/60 backdrop-blur-md">
      <Container>
        <div className="flex h-17 items-center justify-between">
          <Logo />

          {/* Desktop nav links */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                className={
                  index === 0
                    ? "border-b-2 border-black pb-1 text-sm font-medium text-black transition-colors duration-[600ms]"
                    : "text-sm font-medium text-zinc-500 transition-colors duration-[600ms] hover:text-black"
                }
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop right side */}
          <div className="hidden items-center gap-4 md:flex">
            <Link
              to="/login"
              className="text-sm font-medium text-zinc-600 transition-colors duration-200 hover:text-black"
            >
              Login
            </Link>
            <Link to="/login">
              <Button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-zinc-800 cursor-pointer">
                Get started
              </Button>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="flex items-center justify-center text-black md:hidden"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </Container>

      {/* Mobile dropdown menu with animation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t border-zinc-200 bg-white/90 backdrop-blur-md md:hidden"
          >
            <div className="px-4 py-4">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="flex flex-col gap-4"
              >
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium text-zinc-600 transition-colors duration-200 hover:text-black"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: 0.2 }}
                  className="mt-2 flex flex-col gap-3 border-t border-zinc-200 pt-4"
                >
                  <Link
                    to="/login"
                    className="text-sm font-medium text-zinc-600 transition-colors duration-200 hover:text-black"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link to="/login" className="w-full">
                    <Button className="w-full rounded-lg bg-black text-sm font-semibold text-white transition-colors duration-200 hover:bg-zinc-800 cursor-pointer">
                      Get started
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}