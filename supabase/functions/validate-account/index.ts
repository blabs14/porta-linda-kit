import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  try {
    const { data } = await req.json();

    if (!data) {
      return new Response(JSON.stringify({ error: "Dados não fornecidos" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const errors = [];

    if (!data.nome || data.nome.trim().length === 0) {
      errors.push({ field: "nome", message: "Nome da conta é obrigatório" });
    } else if (data.nome.length > 100) {
      errors.push({ field: "nome", message: "Nome deve ter no máximo 100 caracteres" });
    }

    if (!data.tipo) {
      errors.push({ field: "tipo", message: "Tipo de conta é obrigatório" });
    } else {
      const tiposValidos = ['corrente', 'poupança', 'investimento', 'outro'];
      if (!tiposValidos.includes(data.tipo)) {
        errors.push({ field: "tipo", message: "Tipo deve ser 'corrente', 'poupança', 'investimento' ou 'outro'" });
      }
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        data: null,
        errors
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const sanitizedData = {
      nome: data.nome.trim().substring(0, 100),
      tipo: data.tipo
    };

    return new Response(JSON.stringify({
      success: true,
      data: sanitizedData,
      errors: null
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Erro interno do servidor",
      details: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}); 