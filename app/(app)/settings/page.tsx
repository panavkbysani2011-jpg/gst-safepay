import { requireUser } from "@/lib/auth";
import { getRuleConfig } from "@/lib/data/ruleConfig";
import { isDefaultRuleConfig } from "@/lib/rules/ruleConfig";
import { RuleConfigEditor } from "@/app/_components/RuleConfigEditor";

export default async function SettingsPage() {
  const user = await requireUser();
  const config = await getRuleConfig(user.id);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="font-display text-xl font-semibold text-fg">Rule configuration</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          The tax parameters behind every calculation. Ship-defaults reflect current
          law; your chartered accountant can correct any value for your firm and it
          flows straight into the money math — auditable, deterministic, no code change.
        </p>
      </header>

      <RuleConfigEditor config={config} isCustomised={!isDefaultRuleConfig(config)} />

      <p className="text-[12px] text-faint">
        Profile, business details, and theme preferences will join this page next.
      </p>
    </div>
  );
}
