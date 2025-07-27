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

    if (!data.account_id) {
      errors.push({ field: "account_id", message: "ID da conta é obrigatório" });
    }

    if (!data.valor || isNaN(Number(data.valor))) {
      errors.push({ field: "valor", message: "Valor é obrigatório e deve ser um número" });
    } else {
      const valor = Number(data.valor);
      if (valor <= 0) {
        errors.push({ field: "valor", message: "Valor deve ser positivo" });
      }
    }

    if (!data.categoria_id) {
      errors.push({ field: "categoria_id", message: "ID da categoria é obrigatório" });
    }

    if (!data.data) {
      errors.push({ field: "data", message: "Data é obrigatória" });
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
      account_id: data.account_id,
      valor: Math.round(Number(data.valor) * 100) / 100,
      categoria_id: data.categoria_id,
      data: data.data,
      descricao: data.descricao ? data.descricao.trim().substring(0, 255) : undefined
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