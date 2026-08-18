import { NextResponse } from "next/server"

import { requireUser } from "@/lib/auth/session"
import { runGlobalSearch } from "@/services/search/global-search.service"

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") ?? ""

    const results = await runGlobalSearch(user, query)
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: "No se pudo realizar la búsqueda." }, { status: 403 })
  }
}
