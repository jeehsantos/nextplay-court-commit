-- =============================================
-- USER CREDITS SYSTEM
-- =============================================

-- Create user_credits table for storing credit balances
CREATE TABLE public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_credits
CREATE POLICY "Users can view own credits" 
  ON public.user_credits FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert credits" 
  ON public.user_credits FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update credits" 
  ON public.user_credits FOR UPDATE 
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- CREDIT TRANSACTIONS (Audit Trail)
-- =============================================

-- Create credit_transactions table for audit trail
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
  reason TEXT NOT NULL,
  related_session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  related_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view own transactions" 
  ON public.credit_transactions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" 
  ON public.credit_transactions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- UPDATE PAYMENTS TABLE
-- =============================================

-- Add paid_with_credits column to track credit usage
ALTER TABLE public.payments 
ADD COLUMN paid_with_credits NUMERIC DEFAULT 0;

-- =============================================
-- DATABASE FUNCTIONS FOR CREDIT MANAGEMENT
-- =============================================

-- Function to add credits to a user's balance
CREATE OR REPLACE FUNCTION public.add_user_credits(
  p_user_id UUID,
  p_amount NUMERIC,
  p_reason TEXT,
  p_session_id UUID DEFAULT NULL,
  p_payment_id UUID DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  -- Upsert user_credits
  INSERT INTO user_credits (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_credits.balance + p_amount,
      updated_at = now();
  
  -- Get new balance
  SELECT balance INTO v_new_balance FROM user_credits WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO credit_transactions (user_id, amount, transaction_type, reason, related_session_id, related_payment_id)
  VALUES (p_user_id, p_amount, 'credit', p_reason, p_session_id, p_payment_id);
  
  RETURN v_new_balance;
END;
$$;

-- Function to use credits from a user's balance
CREATE OR REPLACE FUNCTION public.use_user_credits(
  p_user_id UUID,
  p_amount NUMERIC,
  p_reason TEXT,
  p_session_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance NUMERIC;
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance FROM user_credits WHERE user_id = p_user_id;
  
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN false;
  END IF;
  
  -- Deduct credits
  UPDATE user_credits
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO credit_transactions (user_id, amount, transaction_type, reason, related_session_id)
  VALUES (p_user_id, p_amount, 'debit', p_reason, p_session_id);
  
  RETURN true;
END;
$$;

-- Function to get a user's credit balance
CREATE OR REPLACE FUNCTION public.get_user_credits(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(balance, 0) FROM user_credits WHERE user_id = p_user_id;
$$;