-- Cloud-First Database Schema for Schedule NSG
-- This schema replaces all localStorage dependencies

-- Enable RLS (Row Level Security) for all tables
-- Enable real-time for all tables

-- Users table for authentication (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Companies/Organizations table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    workplace_location JSONB DEFAULT '{"lat": 0, "lng": 0, "radius": 100}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employees table (replaces localStorage employees array)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    employee_type TEXT NOT NULL DEFAULT 'FT' CHECK (employee_type IN ('FT', 'PT', 'Bank')),
    regular_shifts TEXT,
    target_hours INTEGER DEFAULT 0,
    max_days_per_week INTEGER DEFAULT 0,
    availability TEXT,
    hire_date DATE,
    contact_opt_in BOOLEAN DEFAULT false,
    profile_photo TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedule data table (replaces localStorage scheduleData object)
CREATE TABLE IF NOT EXISTS public.schedule_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shift_time TEXT,
    is_pto BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled')),
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- Schedule notes table (replaces localStorage notesData object)
CREATE TABLE IF NOT EXISTS public.schedule_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    note_text TEXT NOT NULL,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- PTO requests table (replaces localStorage ptoRequests object)
CREATE TABLE IF NOT EXISTS public.pto_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    request_type TEXT NOT NULL DEFAULT 'vacation' CHECK (request_type IN ('vacation', 'sick', 'personal', 'emergency', 'other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    reason TEXT,
    comments TEXT,
    days_requested INTEGER NOT NULL,
    approved_by UUID REFERENCES public.user_profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    denied_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PTO balances table (replaces localStorage employeePTOBalances object)
CREATE TABLE IF NOT EXISTS public.pto_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    total_pto_days INTEGER DEFAULT 0,
    used_pto_days INTEGER DEFAULT 0,
    carry_over_days INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, year)
);

-- Announcements table (replaces localStorage announcements array)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
    audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'management', 'staff')),
    author_id UUID REFERENCES public.user_profiles(id),
    read_by UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table (replaces localStorage auditLogs array)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    description TEXT,
    before_value JSONB,
    after_value JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time tracking table (replaces localStorage timesheet array)
CREATE TABLE IF NOT EXISTS public.time_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location_data JSONB,
    location_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shift bids table (replaces localStorage bidsData object)
CREATE TABLE IF NOT EXISTS public.shift_bids (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    schedule_entry_id UUID REFERENCES public.schedule_entries(id) ON DELETE CASCADE,
    bid_priority INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.user_profiles(id),
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pto_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pto_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Basic examples - should be customized based on business rules)

-- User profiles: Users can read their own profile, admins can read all
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Employees: Users can view employees in their company
CREATE POLICY "Users can view company employees" ON public.employees
    FOR SELECT USING (
        company_id IN (
            SELECT e.company_id FROM public.employees e
            JOIN public.user_profiles up ON e.user_id = up.id
            WHERE up.id = auth.uid()
        )
    );

-- Schedule entries: Users can view schedules in their company
CREATE POLICY "Users can view company schedules" ON public.schedule_entries
    FOR SELECT USING (
        company_id IN (
            SELECT e.company_id FROM public.employees e
            JOIN public.user_profiles up ON e.user_id = up.id
            WHERE up.id = auth.uid()
        )
    );

-- Add similar policies for other tables...

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_employee_date ON public.schedule_entries(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_company_date ON public.schedule_entries(company_id, date);
CREATE INDEX IF NOT EXISTS idx_pto_requests_employee_id ON public.pto_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_pto_requests_status ON public.pto_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read);

-- Enable real-time for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pto_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at_companies
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_employees
    BEFORE UPDATE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_schedule_entries
    BEFORE UPDATE ON public.schedule_entries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_pto_requests
    BEFORE UPDATE ON public.pto_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to automatically create PTO balance record for new employees
CREATE OR REPLACE FUNCTION public.create_initial_pto_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.pto_balances (company_id, employee_id, year, total_pto_days, used_pto_days)
    VALUES (NEW.company_id, NEW.id, EXTRACT(YEAR FROM NOW()), 15, 0); -- Default 15 PTO days
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_pto_balance_for_new_employee
    AFTER INSERT ON public.employees
    FOR EACH ROW EXECUTE FUNCTION public.create_initial_pto_balance();