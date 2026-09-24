import { useJobManager } from "@/hooks/use-job-manager";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * WHO IS JUDGING THIS WORK, ON THE FREELANCER'S OWN CARD.
 *
 * The client's side of a delegated job says AUTOPILOT in three places. The
 * freelancer's side said nothing at all, so the person whose payment depends
 * on the answer could not tell whether a human or an agent was reading their
 * submission. They would find out from the outcome.
 *
 * The daemon now messages them at the moment of hand-over, but a notification
 * is a thing you can miss, delete, or receive before you had the job open. The
 * card is where they look when they are actually working, so the state has to
 * be legible there too.
 *
 * Read from the chain rather than passed down: jobManager is on the escrow, and
 * a client can hand over or take back at any moment without this page
 * reloading. One cheap call per card, cached by the hook's own watcher.
 */
export function AgentManagedBadge({ escrowId }: { escrowId: number | null }) {
  const { manager, loaded } = useJobManager(escrowId);

  /* `manager === null` is a real answer — the client runs it themselves — so
     nothing renders until we actually know, and nothing renders when it is
     genuinely theirs. */
  if (!loaded || !manager) return null;

  const short = `${manager.slice(0, 6)}…${manager.slice(-4)}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-200 cursor-help"
          >
            <Bot className="h-3 w-3 shrink-0" aria-hidden="true" />
            Agent managed
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs space-y-1.5 text-xs leading-relaxed">
          <p className="font-medium">An agent reviews this job, not the client.</p>
          <p>
            It reads what you submit and releases each milestone against the
            criteria published on the job. Those criteria are fixed and visible
            before you apply.
          </p>
          <p>
            It <strong>cannot</strong> move the money anywhere else, and it
            cannot settle a dispute. If you raise one it goes to a human
            arbiter, exactly as it would have done otherwise.
          </p>
          <p className="text-muted-foreground font-mono">{short}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
