import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client with admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify caller's JWT
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if caller is admin
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      throw new Error('Forbidden: Requires admin role');
    }

    const { action, ...payload } = await req.json();

    switch (action) {
      case 'list': {
        const { page = 1, perPage = 50, search = '' } = payload;
        
        // 1. Get users from auth.users via admin API
        // For search, unfortunately auth.admin.listUsers doesn't have robust search, 
        // but we can fetch and filter, or just fetch all and filter if it's small, 
        // or rely on profiles search.
        // Let's get profiles first if there is a search term.
        
        let userIdsToFetch: string[] | null = null;
        
        if (search) {
          const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('user_id')
            .ilike('full_name', `%${search}%`);
            
          userIdsToFetch = profiles?.map(p => p.user_id) || [];
        }

        // Fetch auth users
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000, // Fetch up to 1000 users for simplicity in this admin tool
        });

        if (listError) throw listError;

        let filteredAuthUsers = authUsers.users;
        if (search) {
          filteredAuthUsers = filteredAuthUsers.filter(u => 
            u.email?.toLowerCase().includes(search.toLowerCase()) || 
            (userIdsToFetch && userIdsToFetch.includes(u.id))
          );
        }

        // Pagination
        const start = (page - 1) * perPage;
        const end = start + perPage;
        const paginatedAuthUsers = filteredAuthUsers.slice(start, end);

        // Fetch profiles and roles for these users
        const userIds = paginatedAuthUsers.map(u => u.id);
        
        const [ { data: profiles }, { data: roles } ] = await Promise.all([
          supabaseAdmin.from('profiles').select('*').in('user_id', userIds),
          supabaseAdmin.from('user_roles').select('*').in('user_id', userIds)
        ]);

        const combinedUsers = paginatedAuthUsers.map(u => {
          const profile = profiles?.find(p => p.user_id === u.id);
          const role = roles?.find(r => r.user_id === u.id);
          
          return {
            id: u.id,
            email: u.email,
            email_confirmed_at: u.email_confirmed_at,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            full_name: profile?.full_name || '',
            role: role?.role || 'player'
          };
        });

        return new Response(
          JSON.stringify({ 
            users: combinedUsers, 
            total: filteredAuthUsers.length 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'activate': {
        const { userId } = payload;
        if (!userId) throw new Error('Missing userId');

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          email_confirm: true
        });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, user: data.user }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'update': {
        const { userId, full_name, role } = payload;
        if (!userId) throw new Error('Missing userId');

        // Update profile
        if (full_name !== undefined) {
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ full_name })
            .eq('user_id', userId);
            
          if (profileError) throw profileError;
        }

        // Update role
        if (role !== undefined) {
          // Check if role exists
          const { data: existingRole } = await supabaseAdmin
            .from('user_roles')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (existingRole) {
            const { error: roleError } = await supabaseAdmin
              .from('user_roles')
              .update({ role })
              .eq('user_id', userId);
            if (roleError) throw roleError;
          } else {
            const { error: roleError } = await supabaseAdmin
              .from('user_roles')
              .insert({ user_id: userId, role });
            if (roleError) throw roleError;
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error('Unknown action');
    }
  } catch (error) {
    console.error('Error in manage-users function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
