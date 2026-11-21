import { PageHeader } from "@/components/ui";
import { SettingsForm } from "./form";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" />
      <SettingsForm />
    </div>
  );
}
