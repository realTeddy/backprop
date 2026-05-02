"use client";

import { useMemo } from "react";
import { createMessageSession } from "@/lib/pyodide/message-session";
import type { TutorPyodideSection } from "@/lib/ai/tutor-inline-pyodide";
import { TutorInlinePyodideCell } from "./tutor-inline-pyodide-cell";

export function TutorInlinePyodideSections(props: {
  messageId: string;
  sections: TutorPyodideSection[];
}) {
  // One namespace per message — cells share state within a message.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- messageId is a cache-busting key
  const session = useMemo(() => createMessageSession({}), [props.messageId]);

  return (
    <div className="mt-3 space-y-3">
      {props.sections.map((section, index) => (
        <TutorInlinePyodideCell
          key={`${props.messageId}-${index}`}
          session={session}
          section={section}
        />
      ))}
    </div>
  );
}
