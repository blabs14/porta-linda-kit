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
      errors.push({ field: "nome", message: "Nome da categoria é obrigatório" });
    } else if (data.nome.length > 100) {
      errors.push({ field: "nome", message: "Nome deve ter no máximo 100 caracteres" });
    }

    if (!data.tipo) {
      errors.push({ field: "tipo", message: "Tipo de categoria é obrigatório" });
    } else {
      const tiposValidos = ['despesa', 'receita', 'poupança', 'investimento', 'outro'];
      if (!tiposValidos.includes(data.tipo)) {
        errors.push({ field: "tipo", message: "Tipo deve ser 'despesa', 'receita', 'poupança', 'investimento' ou 'outro'" });
      }
    }

    // Validar cor se fornecida
    if (data.cor && !/^#[0-9A-F]{6}$/i.test(data.cor)) {
      errors.push({ field: "cor", message: "Cor deve ser um código hexadecimal válido" });
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
      tipo: data.tipo,
      cor: data.cor || '#3B82F6'
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