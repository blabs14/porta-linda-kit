-- Create currencies table for multi-currency support
CREATE TABLE IF NOT EXISTS public.currencies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text UNIQUE NOT NULL,
    name text NOT NULL,
    symbol text,
    rate_to_eur numeric NOT NULL DEFAULT 1.0,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_currencies_code ON public.currencies(code);

-- Enable RLS
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- Allow public read access to currencies (all users can see available currencies)
CREATE POLICY "Allow public read access to currencies" ON public.currencies
    FOR SELECT
    USING (true);

-- Only authenticated users can insert/update currencies (admin functionality)
CREATE POLICY "Allow authenticated users to manage currencies" ON public.currencies
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_currencies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_currencies_updated_at_trigger
    BEFORE UPDATE ON public.currencies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_currencies_updated_at();

-- Insert initial currency data
INSERT INTO public.currencies (code, name, symbol, rate_to_eur) VALUES
    ('EUR', 'Euro', '€', 1.0),
    ('USD', 'Dólar Americano', '$', 1.1),
    ('GBP', 'Libra Esterlina', '£', 0.85),
    ('BRL', 'Real Brasileiro', 'R$', 6.2),
    ('AOA', 'Kwanza Angolano', 'Kz', 850.0),
    ('CVE', 'Escudo Cabo-verdiano', '$', 110.0),
    ('MZN', 'Metical Moçambicano', 'MT', 64.0)
ON CONFLICT (code) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE public.currencies IS 'Available currencies for the application with exchange rates relative to EUR';
COMMENT ON COLUMN public.currencies.code IS 'ISO 4217 currency code (e.g., EUR, USD)';
COMMENT ON COLUMN public.currencies.name IS 'Human-readable currency name';
COMMENT ON COLUMN public.currencies.symbol IS 'Currency symbol for display';
COMMENT ON COLUMN public.currencies.rate_to_eur IS 'Exchange rate relative to EUR (1 EUR = rate_to_eur of this currency)';