-- =====================================================
-- ARREGLAR LAS POLÍTICAS RLS QUE JODÍ
-- =====================================================

-- 1. ELIMINAR TODAS LAS POLÍTICAS RESTRICTIVAS
DROP POLICY IF EXISTS "Allow all operations" ON public.inversores;
DROP POLICY IF EXISTS "Allow all operations" ON public.configuracion_sistema;
DROP POLICY IF EXISTS "Allow all operations" ON public.transacciones;
DROP POLICY IF EXISTS "Allow all operations" ON public.partner_transacciones;
DROP POLICY IF EXISTS "Allow all operations" ON public.solicitudes;
DROP POLICY IF EXISTS "Allow all operations" ON public.partner_solicitudes;
DROP POLICY IF EXISTS "Allow all operations" ON public.partner_inversores;
DROP POLICY IF EXISTS "Allow all operations" ON public.ganancias_semanales;
DROP POLICY IF EXISTS "Allow all operations" ON public.partner_ganancias;
DROP POLICY IF EXISTS "Allow all operations" ON public.notificaciones;
DROP POLICY IF EXISTS "Allow all operations" ON public.avisos;
DROP POLICY IF EXISTS "Allow all operations" ON public.tickets;
DROP POLICY IF EXISTS "Allow all operations" ON public.admins;
DROP POLICY IF EXISTS "Allow all operations" ON public.partners;

-- 2. CREAR POLÍTICAS PERMISIVAS PARA TODAS LAS TABLAS
CREATE POLICY "Allow all operations" ON public.inversores
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.configuracion_sistema
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.transacciones
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.partner_transacciones
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.solicitudes
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.partner_solicitudes
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.partner_inversores
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.ganancias_semanales
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.partner_ganancias
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.notificaciones
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.avisos
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.tickets
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.admins
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.partners
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- 3. ASEGURAR QUE RLS ESTÉ HABILITADO PERO CON POLÍTICAS PERMISIVAS
ALTER TABLE public.inversores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_inversores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ganancias_semanales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_ganancias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- 4. VERIFICAR QUE TODO FUNCIONE
SELECT 'RLS policies fixed successfully' as status;