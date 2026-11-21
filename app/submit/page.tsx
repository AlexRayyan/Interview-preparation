import { PageHeader } from "@/components/ui";
import { SHARE_URL } from "@/lib/site";

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Share your interview" subtitle="Help others prepare: share the questions you were asked in a Data Analyst or Data Engineer interview." />
      <div className="card space-y-4 p-6 text-sm">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Click the button below to open a short form on GitHub (you&apos;ll need a free GitHub account).</li>
          <li>Paste your interview experience or list the questions, one per line works best.</li>
          <li>After a maintainer reviews it, the questions are extracted automatically and added to the bank.</li>
        </ol>
        <p className="text-muted">Please don&apos;t include names, emails or anything confidential. Submissions are public on GitHub.</p>
        <a href={SHARE_URL} target="_blank" rel="noopener noreferrer" className="btn">
          Open the form on GitHub
        </a>
      </div>
    </div>
  );
}
