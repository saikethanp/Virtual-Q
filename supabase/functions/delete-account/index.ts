import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const jsonResponse = (body: any, status: number) => {
    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })
  }

  try {
    console.log("Starting account deletion edge function...")
    
    // Use built-in Supabase Edge Function secrets
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const secretKeysJson = Deno.env.get('SUPABASE_SECRET_KEYS')
    const authHeader = req.headers.get('Authorization')

    if (!supabaseUrl) {
      console.error('Server misconfiguration: missing SUPABASE_URL')
      return jsonResponse({ error: 'Server misconfiguration' }, 500)
    }
    if (!secretKeysJson) {
      console.error('Server misconfiguration: missing SUPABASE_SECRET_KEYS')
      return jsonResponse({ error: 'Server misconfiguration' }, 500)
    }
    if (!authHeader) {
      return jsonResponse({ error: 'No authorization header provided' }, 401)
    }

    // Parse SUPABASE_SECRET_KEYS to get the default service role key
    let supabaseServiceKey: string;
    try {
      const keys = JSON.parse(secretKeysJson);
      supabaseServiceKey = keys.default;
      if (!supabaseServiceKey) throw new Error("Missing 'default' key in secrets JSON");
    } catch (e: any) {
      console.error(`Failed to parse SUPABASE_SECRET_KEYS: ${e.message}`)
      return jsonResponse({ error: 'Server misconfiguration' }, 500)
    }

    // Create a supabase client with the service role key for admin privileges
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. VERIFY AUTHORIZATION
    console.log("Verifying token...")
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      console.error(`JWT Verification Failed: ${userError?.message || 'User not found'}`)
      return jsonResponse({ error: 'Invalid or expired session' }, 401)
    }

    const userId = user.id
    console.log(`Verified user ID: ${userId}`)

    // 2. CHECK REQUEST PAYLOAD
    const body = await req.json().catch(() => ({}))
    const businessId = body.businessId

    if (!businessId) {
      console.error('Missing businessId in request')
      return jsonResponse({ error: 'Missing businessId in request payload' }, 400)
    }

    // 3. SECURE OWNERSHIP VALIDATION
    console.log(`Verifying ownership of business: ${businessId} by user: ${userId}`)
    const { data: businessData, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('owner_id', userId)
      .maybeSingle()

    if (businessError) {
      console.error(`Database error verifying ownership: ${businessError.message}`)
      return jsonResponse({ error: 'Database error verifying ownership' }, 500)
    }

    if (!businessData) {
      console.error(`Forbidden: Business ${businessId} not found or not owned by user ${userId}`)
      return jsonResponse({ error: 'Forbidden: Business not found or not owned by authenticated user' }, 403)
    }

    console.log('Ownership verified. Proceeding with deletion.')

    // 4. STORAGE CLEANUP
    console.log(`Cleaning up storage for business: ${businessId}`)
    const folderPath = `${userId}/${businessId}`
    
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from('business-images')
      .list(folderPath)

    if (listError) {
      console.warn(`Storage list warning (ignored): ${listError.message}`)
    } else if (files && files.length > 0) {
      const filePaths = files.map(file => `${folderPath}/${file.name}`)
      const { error: removeError } = await supabaseAdmin.storage
        .from('business-images')
        .remove(filePaths)
        
      if (removeError) {
        console.warn(`Storage remove warning (ignored): ${removeError.message}`)
      } else {
        console.log(`Successfully removed ${filePaths.length} files from storage`)
      }
    } else {
      console.log(`No files found in storage folder: ${folderPath}`)
    }

    // 5. AUTH USER DELETION
    console.log(`Deleting Auth user: ${userId}`)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error(`Failed to delete user in Supabase Auth: ${deleteError.message}`)
      return jsonResponse({ error: `Failed to delete account: ${deleteError.message}` }, 500)
    }

    console.log(`Successfully deleted user: ${userId}`)
    return jsonResponse({ success: true, message: 'Account deleted successfully' }, 200)

  } catch (error: any) {
    console.error(`Edge function error: ${error.message}`)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
