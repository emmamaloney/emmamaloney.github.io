import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    })
  }

  const { email } = await req.json()

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const { data, error } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email)

  if (error) {
    console.error("ERROR:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    )
  }

  const { error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .insert({
        id: data.user.id,
        is_host: false,
        is_admin: false,
        pending_invite: true
      })

  if (profileError) {
    console.error("PROFILE ERROR:", profileError)
    return new Response(
      JSON.stringify({ error: profileError.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    )
  }

  return new Response(
    JSON.stringify({ message: "Invitation sent!" }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  )
})