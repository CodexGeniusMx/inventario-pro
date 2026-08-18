"use client"

import Link from "next/link"

import { EVALUATION_GROUP_LABELS } from "@/tests/keep-ai/evaluation-types"

const EVALUATION_GROUPS = Object.entries(EVALUATION_GROUP_LABELS).map(([id, label]) => ({
  id,
  label,
}))

type DevTestingGroupsProps = {
  activeGroup?: string
}

export function DevTestingGroups({ activeGroup }: DevTestingGroupsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/dev/testing"
        className={`rounded-md border px-2.5 py-1 text-xs ${
          !activeGroup
            ? "border-primary bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted/50"
        }`}
      >
        Todos
      </Link>
      {EVALUATION_GROUPS.map((group) => (
        <Link
          key={group.id}
          href={`/dev/testing?group=${group.id}`}
          className={`rounded-md border px-2.5 py-1 text-xs ${
            activeGroup === group.id
              ? "border-primary bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          {group.label}
        </Link>
      ))}
    </div>
  )
}
