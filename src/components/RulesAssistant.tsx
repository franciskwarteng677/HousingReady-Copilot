"use client";

import {
  BookOpenText,
  CircleAlert,
  MessageCircleQuestion,
  SearchCheck,
  ShieldX,
} from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { RuleCitation } from "@/components/RuleCitation";
import {
  answerRulesQuestion,
  type RulesAssistantResponse,
} from "@/lib/rules-assistant";
import type { HouseholdSize, RuleCorpus } from "@/lib/rules-schema";
import type { StoredIncomeCalculation } from "@/lib/understand-schema";

type RulesAssistantProps = {
  corpus: RuleCorpus;
  householdSize?: HouseholdSize;
  calculation?: StoredIncomeCalculation | null;
};

const suggestedQuestions = [
  "What rule year is being used?",
  "What geography is loaded?",
  "What is the two-person 60% threshold?",
  "When did the threshold become effective?",
  "How was the annualised amount calculated?",
  "What is the difference between the amount and threshold?",
  "What source supports the displayed threshold?",
  "Who makes the final housing decision?",
  "Am I eligible?",
] as const;

const MAX_RULE_QUESTION_LENGTH = 500;

function ConfidenceBadge({
  response,
}: {
  response: RulesAssistantResponse;
}) {
  const Icon =
    response.kind === "refusal"
      ? ShieldX
      : response.kind === "abstention"
        ? CircleAlert
        : SearchCheck;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
      <Icon aria-hidden="true" size={15} />
      {response.confidence}
    </span>
  );
}

export function RulesAssistant({
  corpus,
  householdSize,
  calculation,
}: RulesAssistantProps) {
  const responseRef = useRef<HTMLElement>(null);
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [response, setResponse] = useState<RulesAssistantResponse | null>(null);
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState("");

  function ask(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      const error = "Enter a rule question before searching the corpus.";
      setValidationError(error);
      setMessage(error);
      return;
    }

    if (trimmed.length > MAX_RULE_QUESTION_LENGTH) {
      const error = `Keep the question to ${MAX_RULE_QUESTION_LENGTH} characters or fewer.`;
      setValidationError(error);
      setMessage(error);
      return;
    }

    const nextResponse = answerRulesQuestion(trimmed, {
      corpus,
      householdSize,
      calculation,
    });
    setValidationError("");
    setQuestion(trimmed);
    setSubmittedQuestion(trimmed);
    setResponse(nextResponse);
    setMessage(
      nextResponse.kind === "answer"
        ? "A corpus-grounded explanation is available."
        : nextResponse.kind === "refusal"
          ? "The decision request was refused."
          : "The rules assistant abstained because the loaded corpus does not support an answer.",
    );
    window.setTimeout(() => responseRef.current?.focus(), 0);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  return (
    <section
      aria-labelledby="rules-assistant-heading"
      className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7"
    >
      <p className="inline-flex items-center gap-2 text-sm font-bold text-brand">
        <MessageCircleQuestion aria-hidden="true" size={18} />
        Local-corpus retrieval only
      </p>
      <h2
        id="rules-assistant-heading"
        className="mt-2 text-xl font-bold text-ink"
      >
        Ask about the loaded rules
      </h2>
      <p id="rule-question-help" className="mt-2 text-sm leading-6 text-slate-600">
        Questions are treated as untrusted input. Answers use only the fixed
        local corpus and cannot alter calculations, session access, stage
        locks, or decision boundaries. Limit questions to 500 characters.
      </p>

      <form onSubmit={handleSubmit} className="mt-6">
        <label htmlFor="rule-question" className="block text-sm font-bold text-ink">
          Question about the frozen program context
        </label>
        <textarea
          id="rule-question"
          name="rule-question"
          rows={3}
          maxLength={MAX_RULE_QUESTION_LENGTH}
          value={question}
          aria-describedby={
            validationError
              ? "rule-question-help rule-question-error"
              : "rule-question-help"
          }
          aria-invalid={validationError ? "true" : undefined}
          onChange={(event) => setQuestion(event.target.value)}
          className="mt-2 w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-teal-200"
          placeholder="For example: What rule year is being used?"
        />
        <button
          type="submit"
          className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-bold text-white outline-none hover:bg-ink-soft focus-visible:ring-4 focus-visible:ring-slate-300"
        >
          <BookOpenText aria-hidden="true" size={17} />
          Search loaded corpus
        </button>
        {validationError ? (
          <p
            id="rule-question-error"
            className="mt-3 flex items-start gap-2 text-sm font-bold text-rose-700"
            role="alert"
          >
            <CircleAlert aria-hidden="true" size={17} className="mt-0.5 shrink-0" />
            {validationError}
          </p>
        ) : null}
      </form>

      <div className="mt-5">
        <h3 className="text-sm font-bold text-ink">Suggested questions</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestedQuestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => ask(suggestion)}
              className="min-h-10 rounded-full border border-line bg-canvas px-3 py-2 text-left text-xs font-bold text-slate-700 outline-none hover:border-brand hover:bg-brand-soft focus-visible:ring-4 focus-visible:ring-teal-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {message}
      </p>

      {response ? (
        <article
          ref={responseRef}
          tabIndex={-1}
          aria-labelledby="rules-response-heading"
          className="mt-6 rounded-2xl border border-line bg-canvas p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                Untrusted question
              </p>
              <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                {submittedQuestion}
              </p>
            </div>
            <ConfidenceBadge response={response} />
          </div>
          <h3 id="rules-response-heading" className="mt-5 font-bold text-ink">
            Plain-language explanation
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {response.explanation}
          </p>

          {response.citations.length > 0 ? (
            <div className="mt-5 space-y-4">
              <h4 className="text-sm font-bold text-ink">
                Exact corpus passage used
              </h4>
              {response.citations.map((citation) => (
                <RuleCitation
                  key={citation.citationId}
                  citation={citation}
                />
              ))}
            </div>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
