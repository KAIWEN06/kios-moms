import {
  Navigate
} from 'react-router-dom';

import {
  useEffect,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabaseClient';

const ProtectedRoute = ({
  children
}) => {

  // =========================
  // STATE
  // =========================

  const [loading, setLoading] =
    useState(true);

  const [session, setSession] =
    useState(null);

  // =========================
  // CHECK SESSION
  // =========================

  useEffect(() => {

    const getSession =
      async () => {

        const {
          data: { session }
        } = await supabase.auth
          .getSession();

        setSession(session);

        setLoading(false);
      };

    getSession();

    // =========================
    // AUTH LISTENER
    // =========================

    const {
      data: listener
    } =
      supabase.auth
        .onAuthStateChange(
          (_event, session) => {

            setSession(session);
          }
        );

    return () => {

      listener.subscription
        .unsubscribe();
    };

  }, []);

  // =========================
  // LOADING
  // =========================

  if (loading) {

    return (

      <div className="h-screen flex items-center justify-center font-semibold">

        Memeriksa Session...

      </div>
    );
  }

  // =========================
  // BELUM LOGIN
  // =========================

  if (!session) {

    return (
      <Navigate
        to="/admin/login"
        replace
      />
    );
  }

  // =========================
  // SUDAH LOGIN
  // =========================

  return children;
};

export default ProtectedRoute;