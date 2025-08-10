import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

serve(async (req) => {
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { type, userId, data } = await req.json();

    let notification = {
      user_id: userId,
      title: '',
      message: '',
      type: 'info' as const,
    };

    switch (type) {
      case 'goal_achieved':
        notification = {
          user_id: userId,
          title: '🎉 Meta Atingida!',
          message: `Parabéns! Você atingiu a meta "${data.goalName}" de ${data.goalAmount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}`,
          type: 'success',
        };
        break;

      case 'goal_progress': {
        const progress = Math.round((data.currentAmount / data.goalAmount) * 100);
        notification = {
          user_id: userId,
          title: '📈 Progresso da Meta',
          message: `Sua meta "${data.goalName}" está ${progress}% completa! (${data.currentAmount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })} de ${data.goalAmount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })})`,
          type: 'info',
        };
        break;
      }

      case 'budget_alert': {
        const percentage = Math.round((data.spent / data.budget) * 100);
        notification = {
          user_id: userId,
          title: '⚠️ Alerta de Orçamento',
          message: `Você já gastou ${percentage}% do seu orçamento para ${data.categoryName} (${data.spent.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })} de ${data.budget.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })})`,
          type: percentage > 90 ? 'error' : 'warning',
        };
        break;
      }

      case 'budget_exceeded':
        notification = {
          user_id: userId,
          title: '🚨 Orçamento Excedido',
          message: `Você excedeu o orçamento para ${data.categoryName}! Gasto: ${data.spent.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })} (Orçamento: ${data.budget.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })})`,
          type: 'error',
        };
        break;

      case 'large_transaction':
        notification = {
          user_id: userId,
          title: '💰 Transação Grande',
          message: `Nova transação registrada: ${data.description} - ${data.amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}`,
          type: 'info',
        };
        break;

      case 'monthly_summary': {
        const balance = data.income - data.expenses;
        const balanceType = balance >= 0 ? 'positivo' : 'negativo';
        notification = {
          user_id: userId,
          title: '📊 Resumo Mensal',
          message: `Em ${data.month}: Receitas ${data.income.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}, Despesas ${data.expenses.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}, Saldo ${balanceType} ${Math.abs(balance).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}`,
          type: balance >= 0 ? 'success' : 'warning',
        };
        break;
      }

      case 'family_invite':
        notification = {
          user_id: userId,
          title: '👨‍👩‍👧‍👦 Convite Familiar',
          message: `${data.inviterName} convidou você para juntar-se à família "${data.familyName}"`,
          type: 'info',
        };
        break;

      case 'family_joined':
        notification = {
          user_id: userId,
          title: '🎉 Novo Membro',
          message: `${data.memberName} juntou-se à sua família!`,
          type: 'success',
        };
        break;

      default:
        return new Response(JSON.stringify({ error: "Tipo de notificação não suportado" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
    }

    // Inserir notificação
    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notification);

    if (insertError) {
      throw insertError;
    }

    return new Response(JSON.stringify({
      success: true,
      notification
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