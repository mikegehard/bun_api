import Stripe from 'stripe';
import { Logger } from '@/core/logger/logger';
import { env } from '@/core/config/env';

export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-01-27.acacia' as any
    });
  }

  private async customerExists(email: string) {
    const existing = await this.stripe.customers.search({
      query: `email:'${email}'`,
      limit: 1
    });

    if (existing.data.length > 0) {
      Logger.info(`Stripe customer already exists: ${email}`);
      return true;
    }

    return false;
  }

  /**
   * Orquestra a criação completa da conta financeira no Stripe (Cliente + Assinatura FREE)
   * Adaptado do PaymentAccountService.java
   */
  async generateDefaultPaymentAccount(email: string, name: string) {
    try {
      // Verifica se o cliente já existe no Stripe
      if (await this.customerExists(email)) {
        throw new Error('Stripe customer already exists');
      }
      // 1. Criar Cliente
      const customer = await this.stripe.customers.create({ email, name });
      Logger.info(`Stripe customer created: ${customer.id}`);

      // 2. Buscar Preço do Plano FREE
      const prices = await this.stripe.prices.list({ active: true, expand: ['data.product'] });
      const freePrice = prices.data.find(
        (p) => p.nickname?.toLowerCase() === 'free' || (p.product as Stripe.Product).name?.toLowerCase() === 'free'
      );

      let subscriptionId = '';
      let subscriptionStatus = 'active';
      const priceId = freePrice?.id || '';

      // 3. Criar Assinatura se o preço existir
      if (freePrice) {
        const subscription = await this.stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: freePrice.id }],
          payment_behavior: 'default_incomplete'
        });
        subscriptionId = subscription.id;
        subscriptionStatus = subscription.status;
        Logger.info(`Stripe FREE subscription created: ${subscription.id}`);
      }

      // Retorna os dados formatados para serem salvos no nosso banco
      return {
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscriptionId,
        stripe_subscription_status: subscriptionStatus,
        stripe_price_id: priceId,
        plan: 'FREE',
        unit_amount: freePrice?.unit_amount || 0,
        current_period_start: Math.floor(Date.now() / 1000)
      };
    } catch (error: any) {
      Logger.error(`Stripe integration failed: ${error.message}`);
      throw error;
    }
  }

  async getPrice(planName: string) {
    const prices = await this.stripe.prices.list({ active: true, expand: ['data.product'] });
    return (
      prices.data.find(
        (p) =>
          p.nickname?.toLowerCase() === planName.toLowerCase() ||
          (p.product as Stripe.Product).name?.toLowerCase() === planName.toLowerCase()
      ) || null
    );
  }

  /**
   * Verifica se o plano do usuário está ativo.
   */
  async activePlan(stripeSubscriptionId: string, dbSubscriptionStatus: string): Promise<boolean> {
    try {
      if (!stripeSubscriptionId) return false;
      const subscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
      return subscription.status === 'active' && dbSubscriptionStatus === 'active';
    } catch (error: any) {
      Logger.error(`StripeService (activePlan): ${error.message}`);
      throw new Error(error.message);
    }
  }

  /**
   * Cria uma sessão de checkout para atualizar o plano para PRO.
   */
  async updatePlanToPremium(stripeCustomerId: string): Promise<string | null> {
    try {
      const price = await this.getPrice('PRO');
      if (!price) {
        throw new Error('Price for plan PRO not found');
      }

      const domainUrl = env.APP_URL;

      const session = await this.stripe.checkout.sessions.create({
        success_url: `${domainUrl}/assinatura/sucesso?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${domainUrl}/assinatura/pagamento-cancelado`,
        mode: 'subscription',
        customer: stripeCustomerId,
        line_items: [
          {
            quantity: 1,
            price: price.id
          }
        ]
      });

      return session.url;
    } catch (error: any) {
      Logger.error(`StripeService (updatePlanToPremium): ${error.message}`);
      throw new Error(error.message);
    }
  }

  /**
   * Confirmação de pagamento do plano PRO e retorno dos dados para salvar no DB.
   */
  async confirmPayment(sessionId: string) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      if (!session.subscription) {
        throw new Error('No subscription found for this session');
      }

      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
      const subscription = (await this.stripe.subscriptions.retrieve(subscriptionId)) as any;

      const price = subscription.items.data[0].price;

      return {
        stripe_subscription_id: subscription.id,
        stripe_subscription_status: subscription.status,
        plan: price.nickname || 'PRO',
        stripe_price_id: price.id,
        unit_amount: price.unit_amount,
        current_period_start: subscription.current_period_start
      };
    } catch (error: any) {
      Logger.error(`StripeService (confirmPayment): ${error.message}`);
      throw new Error(error.message);
    }
  }

  /**
   * Cancela uma assinatura e retorna os dados para resetar o usuário para o plano FREE no DB.
   */
  async cancelSubscription(stripeSubscriptionId: string) {
    try {
      const subscriptionCanceled = await this.stripe.subscriptions.cancel(stripeSubscriptionId);

      return {
        stripe_subscription_id: subscriptionCanceled.id,
        stripe_subscription_status: subscriptionCanceled.status,
        plan: 'FREE',
        stripe_price_id: null,
        unit_amount: null,
        current_period_start: null
      };
    } catch (error: any) {
      Logger.error(`StripeService (cancelSubscription): ${error.message}`);
      throw new Error(error.message);
    }
  }
}
