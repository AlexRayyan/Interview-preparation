import { LinkButton, PageHeader } from "@/components/ui";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const STEPS = [
  ["Browse questions", "Search and filter by role, topic, difficulty, source and company. Every question links to where it came from."],
  ["Start a mock interview", "Pick your role and topics. You get one question at a time, balanced across topics."],
  ["Answer and compare", "Type your answer, compare it with the model answer, and rate yourself from 1 to 10."],
  ["Track your progress", "Your average score and weakest topics are saved in your browser. Low scores come back more often."],
  ["Optional: AI feedback", "Connect a free AI provider in Settings to get a score, gaps, a stronger answer and a follow-up question."],
  ["Share your interview", "Help others by sharing the questions you were asked, through a short GitHub form."],
];

export default function TutorialPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Tutorial" subtitle="A 2-minute tour of how to practice with DataPrep." />
      <div className="card overflow-hidden">
        <video controls playsInline preload="metadata" poster={`${base}/tutorial-poster.jpg`} className="block aspect-video w-full bg-black">
          <source src={`${base}/tutorial.mp4`} type="video/mp4" />
          Your browser can&apos;t play this video. <a href={`${base}/tutorial.mp4`}>Download it</a> instead.
        </video>
      </div>
      <ol className="mt-8 grid gap-4 sm:grid-cols-2">
        {STEPS.map(([title, text], i) => (
          <li key={title} className="card flex gap-4 p-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{i + 1}</span>
            <span>
              <span className="block font-medium">{title}</span>
              <span className="text-sm text-muted">{text}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-wrap gap-3">
        <LinkButton href="/practice">Start a mock interview</LinkButton>
        <LinkButton href="/questions" ghost>
          Browse questions
        </LinkButton>
      </div>
    </div>
  );
}
