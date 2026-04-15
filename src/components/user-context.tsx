'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  display_name: string;
  role: string;
  avatar_url?: string;
}

interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
  roleLabel: string;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const ROLE_DISPLAY: Record<string, string> = {
  'admin': 'Quản trị viên',
  'leader_content': 'Leader Content',
  'leader_booking': 'Leader Booking',
  'staff_content': 'Nhân viên Content',
  'staff_booking': 'Nhân viên Booking',
};

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      // If ID match fails (common during local migration or partial auth sync), try matching by email/username
      if (error || !profile) {
        const username = session.user.email?.split('@')[0];
        if (username) {
          const { data: profileByUsername } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();
          
          if (profileByUsername) {
            profile = profileByUsername;
            error = null;
          }
        }
      }

      if (error) {
        console.error('Error fetching user profile:', error);
        // Special case: if email is admin@..., give them admin role even with error
        const isAdminEmail = session.user.email?.toLowerCase().includes('admin');
        setUser({
          display_name: session.user.email?.split('@')[0] || 'User',
          role: isAdminEmail ? 'admin' : 'unknown'
        });
        return;
      }

      setUser(profile);
    } catch (error) {
      console.error('User context exception:', error);
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = user ? ROLE_DISPLAY[user.role] || user.role : '';

  useEffect(() => {
    fetchUserProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchUserProfile();
      else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, roleLabel, refreshUser: fetchUserProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
