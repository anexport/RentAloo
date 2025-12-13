-- Add admin role to user_role enum
ALTER TYPE user_role ADD VALUE 'admin';

-- Helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policies to manage core tables
CREATE POLICY "Admins can manage profiles" ON profiles
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage renter profiles" ON renter_profiles
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage owner profiles" ON owner_profiles
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage equipment" ON equipment
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage equipment photos" ON equipment_photos
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage availability" ON availability_calendar
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage booking requests" ON booking_requests
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage bookings" ON bookings
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage payments" ON payments
    FOR ALL USING (is_admin(auth.uid()));
