import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Wordmark } from "@/components/Wordmark";

export default function NotFoundPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center"
    >
      <Wordmark />
      <h1 className="font-display text-display-xl text-ink">404</h1>
      <p className="max-w-sm text-ink-muted">
        That screen isn't in the prototype. Let's get you back to something real.
      </p>
      <Link to="/">
        <Button>Back to home</Button>
      </Link>
    </motion.div>
  );
}
