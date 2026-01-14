-- Migration: Fix RLS lint warnings (auth initplan + multiple permissive policies)
-- Fold admin access into existing policies and wrap auth.uid() with (select auth.uid()).

-- Remove admin policies that create multiple permissive policies.
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage renter profiles" ON renter_profiles;
DROP POLICY IF EXISTS "Admins can manage owner profiles" ON owner_profiles;
DROP POLICY IF EXISTS "Admins can manage equipment" ON equipment;
DROP POLICY IF EXISTS "Admins can manage equipment photos" ON equipment_photos;
DROP POLICY IF EXISTS "Admins can manage availability" ON availability_calendar;
DROP POLICY IF EXISTS "Admins can manage booking requests" ON booking_requests;
DROP POLICY IF EXISTS "Admins can manage bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
DROP POLICY IF EXISTS "Admins can manage equipment inspections" ON equipment_inspections;
DROP POLICY IF EXISTS "Admins can manage damage claims" ON damage_claims;
DROP POLICY IF EXISTS "Admins can manage user verifications" ON user_verifications;

-- availability_calendar
DROP POLICY IF EXISTS "Equipment owners can insert availability" ON availability_calendar;
DROP POLICY IF EXISTS "Equipment owners can update availability" ON availability_calendar;
DROP POLICY IF EXISTS "Equipment owners can delete availability" ON availability_calendar;

CREATE POLICY "Equipment owners can insert availability" ON availability_calendar
    FOR INSERT TO authenticated
    WITH CHECK (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR EXISTS (
                SELECT 1 FROM equipment
                WHERE equipment.id = availability_calendar.equipment_id
                AND equipment.owner_id = (select auth.uid())
            )
        )
    );

CREATE POLICY "Equipment owners can update availability" ON availability_calendar
    FOR UPDATE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR EXISTS (
                SELECT 1 FROM equipment
                WHERE equipment.id = availability_calendar.equipment_id
                AND equipment.owner_id = (select auth.uid())
            )
        )
    );

CREATE POLICY "Equipment owners can delete availability" ON availability_calendar
    FOR DELETE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR EXISTS (
                SELECT 1 FROM equipment
                WHERE equipment.id = availability_calendar.equipment_id
                AND equipment.owner_id = (select auth.uid())
            )
        )
    );

-- booking_requests
DROP POLICY IF EXISTS "Authenticated users can view booking requests" ON booking_requests;
DROP POLICY IF EXISTS "Authenticated users can update booking requests" ON booking_requests;
DROP POLICY IF EXISTS "Renters can create booking requests" ON booking_requests;
DROP POLICY IF EXISTS "Renters can delete their own pending booking requests" ON booking_requests;

CREATE POLICY "Authenticated users can view booking requests" ON booking_requests
    FOR SELECT TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR (select auth.uid()) = renter_id
            OR EXISTS (
                SELECT 1 FROM equipment
                WHERE equipment.id = booking_requests.equipment_id
                AND equipment.owner_id = (select auth.uid())
            )
            OR EXISTS (
                SELECT 1 FROM equipment
                WHERE equipment.id = booking_requests.equipment_id
                AND equipment.is_available = true
            )
        )
    );

CREATE POLICY "Authenticated users can update booking requests" ON booking_requests
    FOR UPDATE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR EXISTS (
                SELECT 1 FROM equipment
                WHERE equipment.id = booking_requests.equipment_id
                AND equipment.owner_id = (select auth.uid())
            )
            OR (select auth.uid()) = renter_id
        )
    );

CREATE POLICY "Renters can create booking requests" ON booking_requests
    FOR INSERT TO authenticated
    WITH CHECK (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR (select auth.uid()) = renter_id
        )
    );

CREATE POLICY "Renters can delete their own pending booking requests"
    ON booking_requests
    FOR DELETE
    TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR ((select auth.uid()) = renter_id AND status = 'pending')
        )
    );

-- bookings
DROP POLICY IF EXISTS "Authenticated users can view bookings" ON bookings;
DROP POLICY IF EXISTS "Authenticated users can update bookings" ON bookings;

CREATE POLICY "Authenticated users can view bookings" ON bookings
    FOR SELECT TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR EXISTS (
                SELECT 1 FROM booking_requests
                WHERE booking_requests.id = bookings.booking_request_id
                AND booking_requests.renter_id = (select auth.uid())
            )
            OR EXISTS (
                SELECT 1 FROM booking_requests
                JOIN equipment ON equipment.id = booking_requests.equipment_id
                WHERE booking_requests.id = bookings.booking_request_id
                AND equipment.owner_id = (select auth.uid())
            )
        )
    );

CREATE POLICY "Authenticated users can update bookings" ON bookings
    FOR UPDATE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR EXISTS (
                SELECT 1 FROM booking_requests
                WHERE booking_requests.id = bookings.booking_request_id
                AND booking_requests.renter_id = (select auth.uid())
            )
            OR EXISTS (
                SELECT 1 FROM booking_requests
                JOIN equipment ON equipment.id = booking_requests.equipment_id
                WHERE booking_requests.id = bookings.booking_request_id
                AND equipment.owner_id = (select auth.uid())
            )
        )
    );

-- equipment
DROP POLICY IF EXISTS "Authenticated users can view equipment" ON equipment;
DROP POLICY IF EXISTS "Owners can insert their own equipment" ON equipment;
DROP POLICY IF EXISTS "Owners can update their own equipment" ON equipment;
DROP POLICY IF EXISTS "Owners can delete their own equipment" ON equipment;

CREATE POLICY "Authenticated users can view equipment" ON equipment
    FOR SELECT TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR is_available = true
            OR (select auth.uid()) = owner_id
        )
    );

CREATE POLICY "Owners can insert their own equipment" ON equipment
    FOR INSERT TO authenticated
    WITH CHECK (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR (select auth.uid()) = owner_id
        )
    );

CREATE POLICY "Owners can update their own equipment" ON equipment
    FOR UPDATE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR (select auth.uid()) = owner_id
        )
    );

CREATE POLICY "Owners can delete their own equipment" ON equipment
    FOR DELETE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR (select auth.uid()) = owner_id
        )
    );

-- equipment_photos
DROP POLICY IF EXISTS "Equipment owners can insert photos" ON equipment_photos;
DROP POLICY IF EXISTS "Equipment owners can update photos" ON equipment_photos;
DROP POLICY IF EXISTS "Equipment owners can delete photos" ON equipment_photos;

CREATE POLICY "Equipment owners can insert photos" ON equipment_photos
    FOR INSERT TO authenticated
    WITH CHECK (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR EXISTS (
                SELECT 1 FROM equipment
                WHERE equipment.id = equipment_photos.equipment_id
                AND equipment.owner_id = (select auth.uid())
            )
        )
    );

CREATE POLICY "Equipment owners can update photos" ON equipment_photos
    FOR UPDATE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR EXISTS (
                SELECT 1 FROM equipment
                WHERE equipment.id = equipment_photos.equipment_id
                AND equipment.owner_id = (select auth.uid())
            )
        )
    );

CREATE POLICY "Equipment owners can delete photos" ON equipment_photos
    FOR DELETE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR EXISTS (
                SELECT 1 FROM equipment
                WHERE equipment.id = equipment_photos.equipment_id
                AND equipment.owner_id = (select auth.uid())
            )
        )
    );

-- equipment_inspections
DROP POLICY IF EXISTS "Users can view inspections for their bookings" ON equipment_inspections;
DROP POLICY IF EXISTS "Renters can create inspections for their bookings" ON equipment_inspections;
DROP POLICY IF EXISTS "Users can update their verification on inspections" ON equipment_inspections;

CREATE POLICY "Users can view inspections for their bookings"
ON equipment_inspections
FOR SELECT
USING (
  (select auth.uid()) IS NOT NULL AND
  (
    is_admin((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM booking_requests br
      WHERE br.id = equipment_inspections.booking_id
      AND br.renter_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM booking_requests br
      JOIN equipment e ON e.id = br.equipment_id
      WHERE br.id = equipment_inspections.booking_id
      AND e.owner_id = (select auth.uid())
    )
  )
);

CREATE POLICY "Renters can create inspections for their bookings"
ON equipment_inspections
FOR INSERT
WITH CHECK (
  (select auth.uid()) IS NOT NULL AND
  (
    is_admin((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM booking_requests br
      WHERE br.id = equipment_inspections.booking_id
      AND br.renter_id = (select auth.uid())
    )
  )
);

CREATE POLICY "Users can update their verification on inspections"
ON equipment_inspections
FOR UPDATE
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND
  (
    is_admin((select auth.uid()))
    OR (
      EXISTS (
        SELECT 1 FROM booking_requests br
        WHERE br.id = equipment_inspections.booking_id
        AND br.renter_id = (select auth.uid())
      )
      AND NOT verified_by_renter
    )
    OR (
      EXISTS (
        SELECT 1 FROM booking_requests br
        JOIN equipment e ON e.id = br.equipment_id
        WHERE br.id = equipment_inspections.booking_id
        AND e.owner_id = (select auth.uid())
      )
      AND NOT verified_by_owner
    )
  )
)
WITH CHECK (
  (select auth.uid()) IS NOT NULL AND
  (
    is_admin((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM booking_requests br
      WHERE br.id = equipment_inspections.booking_id
      AND br.renter_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM booking_requests br
      JOIN equipment e ON e.id = br.equipment_id
      WHERE br.id = equipment_inspections.booking_id
      AND e.owner_id = (select auth.uid())
    )
  )
);

-- profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profiles;

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR (select auth.uid()) = id
        )
    );

CREATE POLICY "Authenticated users can update profiles" ON profiles
    FOR UPDATE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR (select auth.uid()) = id
        )
    )
    WITH CHECK (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR (select auth.uid()) = id
        )
    );

-- renter_profiles
DROP POLICY IF EXISTS "Users can view their own renter profile" ON renter_profiles;
DROP POLICY IF EXISTS "Users can update their own renter profile" ON renter_profiles;
DROP POLICY IF EXISTS "Users can insert their own renter profile" ON renter_profiles;

CREATE POLICY "Users can view their own renter profile" ON renter_profiles
    FOR SELECT TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR (select auth.uid()) = profile_id
        )
    );

CREATE POLICY "Users can update their own renter profile" ON renter_profiles
    FOR UPDATE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR (select auth.uid()) = profile_id
        )
    );

CREATE POLICY "Users can insert their own renter profile" ON renter_profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR (select auth.uid()) = profile_id
        )
    );

-- owner_profiles
DROP POLICY IF EXISTS "Users can view their own owner profile" ON owner_profiles;
DROP POLICY IF EXISTS "Users can update their own owner profile" ON owner_profiles;
DROP POLICY IF EXISTS "Users can insert their own owner profile" ON owner_profiles;

CREATE POLICY "Users can view their own owner profile" ON owner_profiles
    FOR SELECT TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR (select auth.uid()) = profile_id
        )
    );

CREATE POLICY "Users can update their own owner profile" ON owner_profiles
    FOR UPDATE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR (select auth.uid()) = profile_id
        )
    );

CREATE POLICY "Users can insert their own owner profile" ON owner_profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR (select auth.uid()) = profile_id
        )
    );

-- payments
DROP POLICY IF EXISTS "Authenticated users can view payments" ON payments;

CREATE POLICY "Authenticated users can view payments" ON payments
    FOR SELECT TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR EXISTS (
                SELECT 1 FROM booking_requests
                WHERE booking_requests.id = payments.booking_request_id
                AND booking_requests.renter_id = (select auth.uid())
            )
            OR EXISTS (
                SELECT 1 FROM booking_requests
                JOIN equipment ON equipment.id = booking_requests.equipment_id
                WHERE booking_requests.id = payments.booking_request_id
                AND equipment.owner_id = (select auth.uid())
            )
        )
    );

-- user_verifications
DROP POLICY IF EXISTS "Users can view their own verifications" ON user_verifications;
DROP POLICY IF EXISTS "Users can create their own verifications" ON user_verifications;
DROP POLICY IF EXISTS "Users can update their own verifications" ON user_verifications;

CREATE POLICY "Users can view their own verifications" ON user_verifications
    FOR SELECT TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR (select auth.uid()) = user_id
        )
    );

CREATE POLICY "Users can create their own verifications" ON user_verifications
    FOR INSERT TO authenticated
    WITH CHECK (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR (select auth.uid()) = user_id
        )
    );

CREATE POLICY "Users can update their own verifications" ON user_verifications
    FOR UPDATE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            is_admin((select auth.uid()))
            OR (select auth.uid()) = user_id
        )
    );

-- content_translations
DROP POLICY IF EXISTS "Users can select translations for own equipment" ON content_translations;
DROP POLICY IF EXISTS "Authenticated owners can delete translations" ON content_translations;
DROP POLICY IF EXISTS "Users can insert translations for own equipment" ON content_translations;
DROP POLICY IF EXISTS "Users can update translations for own equipment" ON content_translations;
DROP POLICY IF EXISTS "Users can delete translations for own equipment" ON content_translations;

CREATE POLICY "Users can insert translations for own equipment"
ON content_translations
FOR INSERT
TO authenticated
WITH CHECK (
  content_type = 'equipment' AND
  EXISTS (
    SELECT 1 FROM equipment
    WHERE equipment.id = content_translations.content_id
    AND equipment.owner_id = (select auth.uid())
  )
);

CREATE POLICY "Users can update translations for own equipment"
ON content_translations
FOR UPDATE
TO authenticated
USING (
  content_type = 'equipment' AND
  EXISTS (
    SELECT 1 FROM equipment
    WHERE equipment.id = content_translations.content_id
    AND equipment.owner_id = (select auth.uid())
  )
);

CREATE POLICY "Users can delete translations for own equipment"
ON content_translations
FOR DELETE
TO authenticated
USING (
  content_type = 'equipment' AND
  EXISTS (
    SELECT 1 FROM equipment
    WHERE equipment.id = content_translations.content_id
    AND equipment.owner_id = (select auth.uid())
  )
);

-- damage_claims
ALTER TABLE damage_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view claims related to their bookings" ON damage_claims;
DROP POLICY IF EXISTS "Owners can file claims for their equipment" ON damage_claims;
DROP POLICY IF EXISTS "Related users can update claims" ON damage_claims;

CREATE POLICY "Users can view claims related to their bookings"
ON damage_claims
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND
  (
    is_admin((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM booking_requests br
      JOIN equipment e ON e.id = br.equipment_id
      WHERE br.id = damage_claims.booking_id
      AND (br.renter_id = (select auth.uid()) OR e.owner_id = (select auth.uid()))
    )
  )
);

CREATE POLICY "Owners can file claims for their equipment"
ON damage_claims
FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.uid()) IS NOT NULL AND
  (
    is_admin((select auth.uid()))
    OR (
      filed_by = (select auth.uid())
      AND EXISTS (
        SELECT 1 FROM booking_requests br
        JOIN equipment e ON e.id = br.equipment_id
        WHERE br.id = damage_claims.booking_id
        AND e.owner_id = (select auth.uid())
      )
    )
  )
);

CREATE POLICY "Related users can update claims"
ON damage_claims
FOR UPDATE
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND
  (
    is_admin((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM booking_requests br
      JOIN equipment e ON e.id = br.equipment_id
      WHERE br.id = damage_claims.booking_id
      AND (br.renter_id = (select auth.uid()) OR e.owner_id = (select auth.uid()))
    )
  )
)
WITH CHECK (
  (select auth.uid()) IS NOT NULL AND
  (
    is_admin((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM booking_requests br
      JOIN equipment e ON e.id = br.equipment_id
      WHERE br.id = damage_claims.booking_id
      AND (br.renter_id = (select auth.uid()) OR e.owner_id = (select auth.uid()))
    )
  )
);

-- notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- notification_preferences
DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- rental_events
DROP POLICY IF EXISTS "Users can view rental events for their bookings" ON rental_events;
DROP POLICY IF EXISTS "Users can create rental events for their bookings" ON rental_events;

CREATE POLICY "Users can view rental events for their bookings"
ON rental_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM booking_requests br
    JOIN equipment e ON br.equipment_id = e.id
    WHERE br.id = rental_events.booking_id
    AND (br.renter_id = (select auth.uid()) OR e.owner_id = (select auth.uid()))
  )
);

CREATE POLICY "Users can create rental events for their bookings"
ON rental_events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM booking_requests br
    JOIN equipment e ON br.equipment_id = e.id
    WHERE br.id = booking_id
    AND (br.renter_id = (select auth.uid()) OR e.owner_id = (select auth.uid()))
  )
);

-- user_favorites
DROP POLICY IF EXISTS "Users can view own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Users can add favorites" ON user_favorites;
DROP POLICY IF EXISTS "Users can remove favorites" ON user_favorites;

CREATE POLICY "Users can view own favorites"
  ON user_favorites FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can add favorites"
  ON user_favorites FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can remove favorites"
  ON user_favorites FOR DELETE
  USING ((select auth.uid()) = user_id);
