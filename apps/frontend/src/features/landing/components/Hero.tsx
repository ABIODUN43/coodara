import { Button } from "@/components/ui/button";
import { Container } from "@/components/layouts/Container";
import hero from "@/assets/hero.png";
import { motion } from "framer-motion";
import { GitPullRequest } from "lucide-react";

export function Hero() {
  return (
    <section className="py-32">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-6 inline-flex rounded-full border px-4 py-2 text-sm">
              AI-Powered Software Architecture Intelligence
            </div>

            <h1 className="mb-6 text-6xl font-bold leading-tight">
              Build Better Software Architecture with AI
            </h1>

            <p className="mb-8 text-lg text-muted-foreground">
              Analyze repositories, understand systems, detect bottlenecks,
              and evolve your architecture.
            </p>

            <div className="flex gap-4">
              <Button size="lg">
                <GitPullRequest className="mr-2 h-4 w-4" />
                Continue with GitHub
              </Button>

              <Button variant="outline" size="lg">
                View Documentation
              </Button>
            </div>
          </motion.div>

          {/* Right Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 1,
              delay: 0.2,
            }}
          >
            <img
              src={hero}
              alt="Codara Hero"
              className="w-full rounded-3xl"
            />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}