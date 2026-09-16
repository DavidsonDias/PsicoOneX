-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table for psychologists
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  crp TEXT,
  specialty TEXT,
  phone TEXT,
  avatar_url TEXT,
  clinic_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  psychologist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  cpf TEXT,
  address TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  psychologist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 50,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  type TEXT DEFAULT 'presential' CHECK (type IN ('presential', 'online')),
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create medical_records table (prontuários)
CREATE TABLE public.medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  psychologist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  session_number INTEGER,
  session_date DATE NOT NULL,
  complaints TEXT,
  observations TEXT,
  techniques_used TEXT,
  evolution TEXT,
  next_steps TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create financial_transactions table
CREATE TABLE public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  psychologist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'pix', 'transfer', 'health_insurance')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  due_date DATE,
  paid_date DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for patients
CREATE POLICY "Psychologists can view their patients"
  ON public.patients FOR SELECT
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can create patients"
  ON public.patients FOR INSERT
  WITH CHECK (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can update their patients"
  ON public.patients FOR UPDATE
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can delete their patients"
  ON public.patients FOR DELETE
  USING (auth.uid() = psychologist_id);

-- RLS Policies for appointments
CREATE POLICY "Psychologists can view their appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can create appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can update their appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can delete their appointments"
  ON public.appointments FOR DELETE
  USING (auth.uid() = psychologist_id);

-- RLS Policies for medical_records
CREATE POLICY "Psychologists can view their records"
  ON public.medical_records FOR SELECT
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can create records"
  ON public.medical_records FOR INSERT
  WITH CHECK (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can update their records"
  ON public.medical_records FOR UPDATE
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can delete their records"
  ON public.medical_records FOR DELETE
  USING (auth.uid() = psychologist_id);

-- RLS Policies for financial_transactions
CREATE POLICY "Psychologists can view their transactions"
  ON public.financial_transactions FOR SELECT
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can create transactions"
  ON public.financial_transactions FOR INSERT
  WITH CHECK (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can update their transactions"
  ON public.financial_transactions FOR UPDATE
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can delete their transactions"
  ON public.financial_transactions FOR DELETE
  USING (auth.uid() = psychologist_id);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Usuário'),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at on all tables
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_medical_records_updated_at
  BEFORE UPDATE ON public.medical_records
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_financial_transactions_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();